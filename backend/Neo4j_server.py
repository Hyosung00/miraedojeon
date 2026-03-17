from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from config import config

# ===== Neo4j Aura 접속 설정 (.env에서 로드) =====
URI = config.neo4j['uri']
USERNAME = config.neo4j['username']
PASSWORD = config.neo4j['password']
DBNAME = config.neo4j['dbname']
ALLOW_SELF_SIGNED = bool(config.neo4j.get('allow_self_signed', False))

# MongoDB 접속 정보 (필요시 사용)
MONGO_URI = config.mongodb['uri']
DB_NAME = config.mongodb['db_name']
NODES_COLLECTION = config.mongodb['collections']['nodes']
EDGES_COLLECTION = config.mongodb['collections']['edges']
# ==================================


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용: 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _suggest_bolt(uri: str) -> str:
    """neo4j:// 계열 -> bolt:// 계열로 치환"""
    if uri.startswith("neo4j+s://"):
        return "bolt+s://" + uri[len("neo4j+s://"):]
    if uri.startswith("neo4j+ssc://"):
        return "bolt+ssc://" + uri[len("neo4j+ssc://"):]
    if uri.startswith("neo4j://"):
        return "bolt://" + uri[len("neo4j://"):]
    return uri


def _suggest_self_signed_scheme(uri: str) -> str:
    """+s 계열 스킴을 +ssc 계열로 치환 (인증서 체인 검증 완화)"""
    if uri.startswith("neo4j+s://"):
        return "neo4j+ssc://" + uri[len("neo4j+s://"):]
    if uri.startswith("bolt+s://"):
        return "bolt+ssc://" + uri[len("bolt+s://"):]
    return uri


def _build_candidate_uris(uri: str, allow_self_signed: bool):
    candidates = []
    seen = set()

    def add(u: str):
        if not u or u in seen:
            return
        seen.add(u)
        candidates.append(u)

    add(uri)
    add(_suggest_bolt(uri))

    if allow_self_signed:
        base = list(candidates)
        for u in base:
            add(_suggest_self_signed_scheme(u))

    return candidates


class Neo4jConnector:
    def __init__(self, uri: str, user: str, password: str):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = self._connect_driver()

    def _connect_driver(self):
        last_error = None
        candidates = _build_candidate_uris(self.uri, ALLOW_SELF_SIGNED)

        for candidate_uri in candidates:
            try:
                drv = GraphDatabase.driver(candidate_uri, auth=(self.user, self.password))
                drv.verify_connectivity()
                self.uri = candidate_uri
                return drv
            except AuthError:
                raise
            except Exception as e:
                last_error = e

        if last_error:
            raise last_error
        raise ServiceUnavailable("No Neo4j URI candidates available")

    def close(self):
        try:
            self.driver.close()
        except Exception:
            pass

    # ---------------- Core ----------------
    def fetch_nodes(self, activeView: str = "default", project: Optional[str] = None):
        def safe_serialize(obj):
            try:
                d = dict(obj)
            except Exception:
                d = {}
            try:
                d["__labels"] = list(getattr(obj, "labels", []))
            except Exception:
                d["__labels"] = []
            try:
                d["__element_id"] = getattr(obj, "element_id", None)
            except Exception:
                d["__element_id"] = None
            try:
                d["__id"] = getattr(obj, "id", None)
            except Exception:
                d["__id"] = None
            if "id" not in d:
                d["id"] = d.get("__element_id") or d.get("__id") or d.get("ip") or d.get("name")
            # layer 힌트(라벨→소문자) 추가
            try:
                labs = [lab.lower() for lab in d.get("__labels", [])]
                for cand in ("physical", "logical", "persona"):
                    if cand in labs:
                        d["layer"] = cand
                        break
            except Exception:
                pass
            return d

        def pick_id(props, raw):
            if props is None: return None
            return (
                props.get("id")
                or getattr(raw, "element_id", None)
                or getattr(raw, "id", None)
                or props.get("ip")
                or props.get("name")
            )

        # === (A) 3계층: HOSTS + USES 모두 조회 ===
        if activeView in {"3layer", "cyber3layer", "threelayer", "multilayer"}:
            params = {"project": project}

            query_hosts = """
            MATCH p1 = (ph:Physical)-[r1:HOSTS]->(lg:Logical)
            WHERE $project IS NULL
               OR coalesce(ph.project,'') = $project
               OR coalesce(lg.project,'') = $project
            RETURN p1 AS p, 'HOSTS' AS rel_type
            LIMIT 400
            """

            query_uses = """
            MATCH p2 = (lg:Logical)-[r2:USES]->(pr:Persona)
            WHERE $project IS NULL
               OR coalesce(lg.project,'') = $project
               OR coalesce(pr.project,'') = $project
            RETURN p2 AS p, 'USES' AS rel_type
            LIMIT 400
            """

            query_physical = """
            MATCH p3 = (ph1:Physical)-[r3]-(ph2:Physical)
            WHERE $project IS NULL
               OR coalesce(ph1.project,'') = $project
               OR coalesce(ph2.project,'') = $project
            RETURN p3 AS p, 'PHYSICAL' AS rel_type
            LIMIT 78
            """

            records = []
            with self.driver.session(database=DBNAME) as session:
                try:
                    for q in (query_hosts, query_uses, query_physical):
                        result = session.run(q, **params)
                        for rec in result:
                            path = rec.get("p")
                            rel_type = rec.get("rel_type")
                            if not path or not path.relationships:
                                continue
                            n_obj = path.start_node
                            t_obj = path.end_node
                            r_obj = path.relationships[0]

                            src = safe_serialize(n_obj) if n_obj else {}
                            dst = safe_serialize(t_obj) if t_obj else {}
                            edge = dict(r_obj) if r_obj else {}
                            edge["rel"] = rel_type

                            sid = pick_id(src, n_obj)
                            tid = pick_id(dst, t_obj)
                            src["id"], dst["id"] = sid, tid
                            edge["sourceIP"], edge["targetIP"] = sid, tid

                            records.append({"src_IP": src, "dst_IP": dst, "edge": edge})
                except Exception as e:
                    print(f"[neo4j][3layer] query failed; activeView={activeView} project={project} error={e}")
                    raise

            return records

        # === (B) HS_DB.py 스타일 쿼리 (target, active, external) ===
        if activeView == "target":
            return self._fetch_target(safe_serialize, pick_id)
        elif activeView == "external":
            return self._fetch_external(safe_serialize, pick_id)

        # === (C) 그 외 뷰 (수정된 Zone 로직 포함) ===
        where_parts, params = [], {}
        order_clause = "ORDER BY rand()"
        limit_clause = ""
        
        # 1. 기본 쿼리: 연결된 것만 찾음 (Zone 뷰가 아닐 때 사용)
        base = """
        MATCH (n:Device)-[r]->(t:Device)
        WITH n, r, t, toLower(coalesce(r.type, TYPE(r))) AS _layer
        """

        is_zone_view = False

        if activeView in {"physical", "logical", "persona"}:
            params["rtype"] = activeView
            where_parts.append("_layer = $rtype")
        elif activeView == "externalInternal":
            where_parts.append("coalesce(n.project,'') <> coalesce(t.project,'')")
        elif activeView in {"internalOnly", "internaltopology"}:
            where_parts.append("coalesce(n.project,'') = 'internal' AND coalesce(t.project,'') = 'internal'")
        elif activeView == "externalOnly":
            where_parts.append("coalesce(n.project,'') = 'external' AND coalesce(t.project,'') = 'external'")
        
        # ---------------------------------------------------------
        # [수정됨] Zone 뷰 처리: UNION을 사용하여 고립된 노드까지 확실하게 조회
        # ---------------------------------------------------------
        elif activeView.startswith("zone"):
            is_zone_view = True
            
            clean_view = activeView.replace("_includeIsolated", "").replace("_strict", "")
            # includeIsolated 힌트가 있거나, 기본적으로 모든 것을 보고 싶다면 아래 로직을 탐
            
            try:
                num_part = clean_view.replace("zone", "")
                params["zone"] = int(num_part)
            except ValueError:
                pass
            
            # [Query Part 1] 연결된 노드들
            query_connected = """
            MATCH (n:Device)-[r]-(t:Device)
            WHERE n.zone = $zone
            RETURN n, r, t, toLower(type(r)) as _layer
            """
            
            # [Query Part 2] 고립된 노드들 (관계 없음)
            query_isolated = """
            MATCH (n:Device)
            WHERE n.zone = $zone AND NOT (n)--()
            RETURN n, NULL as r, NULL as t, NULL as _layer
            """
            
            # UNION으로 합침
            base = f"{query_connected} UNION {query_isolated}"
            
            # Zone 뷰에서는 base 자체가 전체 쿼리 역할을 함
            query = base 
            
            # 여기서 바로 실행하고 리턴 (아래 공통 로직 건너뜀)
            records = []
            with self.driver.session(database=DBNAME) as session:
                result = session.run(query, **params)
                for rec in result:
                    n_obj = rec.get("n")
                    t_obj = rec.get("t")
                    r_obj = rec.get("r")
                    layer = rec.get("_layer")

                    src = safe_serialize(n_obj) if n_obj else {}
                    
                    if t_obj:
                        dst = safe_serialize(t_obj)
                        dst_id = pick_id(dst, t_obj)
                        dst["id"] = dst_id
                    else:
                        dst = None
                        dst_id = None

                    if r_obj:
                        edge = dict(r_obj)
                        if layer: edge["layer"] = layer
                        if dst_id:
                            edge["sourceIP"] = pick_id(src, n_obj)
                            edge["targetIP"] = dst_id
                    else:
                        edge = None
                    
                    src["id"] = pick_id(src, n_obj)
                    records.append({"src_IP": src, "dst_IP": dst, "edge": edge})
            
            return records

        elif activeView.startswith("subnet:"):
            subnet = activeView.split("subnet:", 1)[1].strip()
            if subnet:
                params["subnet"] = subnet
                where_parts.append("n.subnet = $subnet AND t.subnet = $subnet")

        # 쿼리 조립 (Zone 뷰가 아닐 때만 실행됨)
        where_clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
        query = f"""
            {base}
            {where_clause}
            {order_clause}
            {limit_clause}
            RETURN n, r, t, _layer
        """

        records = []
        with self.driver.session(database=DBNAME) as session:
            result = session.run(query, **params)
            for rec in result:
                n_obj = rec.get("n")
                t_obj = rec.get("t")
                r_obj = rec.get("r")
                layer = rec.get("_layer")

                src = safe_serialize(n_obj) if n_obj else {}
                dst = safe_serialize(t_obj) if t_obj else {}
                edge = dict(r_obj) if r_obj else {}
                if layer:
                    edge["layer"] = layer

                sid = pick_id(src, n_obj)
                tid = pick_id(dst, t_obj)
                
                src["id"], dst["id"] = sid, tid
                edge["sourceIP"], edge["targetIP"] = sid, tid

                records.append({"src_IP": src, "dst_IP": dst, "edge": edge})

        return records

    # HS_DB.py 스타일 쿼리 함수들
    def _fetch_external(self, safe_serialize, pick_id):
        return []

    def _fetch_target(self, safe_serialize, pick_id):
        data = []
        query = "MATCH (n)-[r]->(t) WHERE n.project = 'facility' AND t.project = 'facility' RETURN n, r, t ORDER BY rand() LIMIT 500"
        with self.driver.session(database=DBNAME) as session:
            result = session.run(query)
            for record in result:
                n_obj = record.get("n")
                t_obj = record.get("t")
                r_obj = record.get("r")
                source = safe_serialize(n_obj) if n_obj else {}
                target = safe_serialize(t_obj) if t_obj else {}
                edge = dict(r_obj) if r_obj else {}
                source_id = pick_id(source, n_obj)
                target_id = pick_id(target, t_obj)
                edge["sourceIP"] = source_id
                edge["targetIP"] = target_id
                source["id"] = source_id
                target["id"] = target_id
                data.append({
                    "src_IP": source,
                    "dst_IP": target,
                    "edge": edge
                })
        return data

    def _fetch_active(self, safe_serialize, pick_id):
        data = []
        query = "MATCH (n)-[r]->(t) RETURN n, r, t ORDER BY rand() LIMIT 20"
        with self.driver.session(database=DBNAME) as session:
            result = session.run(query)
            for record in result:
                n_obj = record.get("n")
                t_obj = record.get("t")
                r_obj = record.get("r")
                source = safe_serialize(n_obj) if n_obj else {}
                target = safe_serialize(t_obj) if t_obj else {}
                edge = dict(r_obj) if r_obj else {}
                source_id = pick_id(source, n_obj)
                target_id = pick_id(target, t_obj)
                edge["sourceIP"] = source_id
                edge["targetIP"] = target_id
                source["id"] = source_id
                target["id"] = target_id
                data.append({
                    "src_IP": source,
                    "dst_IP": target,
                    "edge": edge
                })
        return data


# ------------------ Routes ------------------

@app.get("/neo4j/nodes")
def get_nodes(activeView: str = "default", project: Optional[str] = None, includeIsolated: bool = False):
    neo4j = Neo4jConnector(URI, USERNAME, PASSWORD)
    try:
        # includeIsolated 플래그를 처리하기 위해 activeView에 힌트 추가
        view = activeView
        if includeIsolated and activeView.startswith("zone"):
            view = activeView + "_includeIsolated"
            
        data = neo4j.fetch_nodes(view, project)
        return JSONResponse(content=data)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=f"Neo4j auth failed: {e}")
    except ServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=f"Neo4j routing/connection failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j error: {e}")
    finally:
        neo4j.close()


@app.get("/neo4j/ping")
def neo4j_ping():
    connector = None
    try:
        connector = Neo4jConnector(URI, USERNAME, PASSWORD)
        with connector.driver.session(database=DBNAME) as s:
            s.run("RETURN 1 AS ok").single()
        return {
            "ok": True,
            "uri": connector.uri,
            "db": DBNAME,
            "allow_self_signed": ALLOW_SELF_SIGNED
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "uri": URI,
                "db": DBNAME,
                "allow_self_signed": ALLOW_SELF_SIGNED,
                "error": str(e)
            }
        )
    finally:
        if connector:
            connector.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}
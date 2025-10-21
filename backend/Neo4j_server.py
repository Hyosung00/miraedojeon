from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

# ===== Neo4j Aura 접속 설정 =====
# neo4j 연결 정보 - 내부망(현욱), 표적(효성, 지수)
# node 분류 (n:Device{project:"internal or facility"})
NEO4J_URI = "neo4j+s://eff16eb9.databases.neo4j.io"
URI = "neo4j+ssc://eff16eb9.databases.neo4j.io"
USERNAME = "neo4j"
PASSWORD = "_G6MBldCj1gGO_hWjogaMJpleFbjuSZKlMHohGucVrA"
DBNAME = "neo4j"
# ==================================

# MongoDB 접속 정보 (필요시 사용)
MONGO_URI = "mongodb+srv://lovea:milab123@cluster0.zvlayyo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "network_traffic"
NODES_COLLECTION = "nodes"
EDGES_COLLECTION = "edges"


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


class Neo4jConnector:
    def __init__(self, uri: str, user: str, password: str):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = self._connect_driver()

    def _connect_driver(self):
        try:
            drv = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            drv.verify_connectivity()
            return drv
        except ServiceUnavailable:
            if self.uri.startswith(("neo4j://", "neo4j+s://", "neo4j+ssc://")):
                alt = _suggest_bolt(self.uri)
                drv = GraphDatabase.driver(alt, auth=(self.user, self.password))
                drv.verify_connectivity()
                self.uri = alt
                return drv
            raise
        except AuthError:
            raise

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
            return (
                props.get("id")
                or getattr(raw, "element_id", None)
                or getattr(raw, "id", None)
                or props.get("ip")
                or props.get("name")
            )

        # === (A) 3계층: HOSTS + USES 모두 조회 ===
        if activeView in {"3layer", "cyber3layer", "threelayer", "multilayer"}:
            # project 필터는 선택적이지만, Cypher에서 WITH $project AS p 를 사용하므로
            # 항상 파라미터를 전달합니다 (없다면 None을 전달하여 p가 NULL이 되게 함).
            params = {"project": project}

            # Some Neo4j setups don't support CALL {...} subqueries; split into two MATCH queries
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

            # 추가: Physical-Physical 동일 레이어 연결을 가져옴 (프로젝트 필터 적용)
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
                            edge["rel"] = rel_type  # "HOSTS" | "USES"

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
        # HS_DB.py에서 사용되던 activeView 처리
        if activeView == "target":
            return self._fetch_target(safe_serialize, pick_id)
        elif activeView == "external":
            return self._fetch_external(safe_serialize, pick_id)

        # === (C) 그 외 뷰(HW_DB.py 기존) ===
        where_parts, params = [], {}
        order_clause = "ORDER BY rand()"
        limit_clause = ""

        base = """
        MATCH (n:Device)-[r]->(t:Device)
        WITH n, r, t, toLower(coalesce(r.type, TYPE(r))) AS _layer
        """

        if activeView in {"physical", "logical", "persona"}:
            params["rtype"] = activeView
            where_parts.append("_layer = $rtype")
        elif activeView == "externalInternal":
            where_parts.append("coalesce(n.project,'') <> coalesce(t.project,'')")
        elif activeView in {"internalOnly", "internaltopology"}:
            where_parts.append("coalesce(n.project,'') = 'internal' AND coalesce(t.project,'') = 'internal'")
        elif activeView == "externalOnly":
            where_parts.append("coalesce(n.project,'') = 'external' AND coalesce(t.project,'') = 'external'")
        elif activeView.startswith("zone"):
            strict = activeView.endswith("_strict")
            num_part = activeView.replace("zone", "").replace("_strict", "")
            try:
                params["zone"] = int(num_part)
                where_parts.append(
                    "n.zone = $zone AND t.zone = $zone" if strict else "n.zone = $zone OR t.zone = $zone"
                )
            except ValueError:
                pass
        elif activeView.startswith("subnet:"):
            subnet = activeView.split("subnet:", 1)[1].strip()
            if subnet:
                params["subnet"] = subnet
                where_parts.append("n.subnet = $subnet AND t.subnet = $subnet")

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
        # 외부 네트워크 노드 반환 로직
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
def get_nodes(activeView: str = "default", project: Optional[str] = None):
    neo4j = Neo4jConnector(URI, USERNAME, PASSWORD)
    try:
        data = neo4j.fetch_nodes(activeView, project)
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
    try:
        tmp = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
        tmp.verify_connectivity()
        with tmp.session(database=DBNAME) as s:
            s.run("RETURN 1 AS ok").single()
        tmp.close()
        return {"ok": True, "uri": URI, "db": DBNAME}
    except Exception as e:
        return JSONResponse(status_code=503, content={"ok": False, "uri": URI, "db": DBNAME, "error": str(e)})


@app.get("/health")
def health_check():
    return {"status": "ok"}


# === OffensiveStrategy.jsx 기반 API ===

@app.get("/neo4j/topology")
def get_device_topology():
    """
    Device 토폴로지(노드/엣지) 반환
    """
    neo4j = Neo4jConnector(URI, USERNAME, PASSWORD)
    query = '''
        MATCH (d:Device{project:"facility"})
        OPTIONAL MATCH (d)-[r:CONNECTED{project:"facility"}]-(d2:Device{project:"facility"})
        RETURN d, r, d2
    '''
    try:
        nodes_map = {}
        edges_map = {}

        def id_of(entity):
            if not entity:
                return None
            # Neo4j Python driver uses 'identity' property, not 'id'
            if hasattr(entity, 'id'):
                idval = entity.id
                # Integer conversion for Neo4j integer types
                if hasattr(idval, '__int__'):
                    return int(idval)
                return idval
            return None

        def label_of(entity):
            if not entity:
                return ""
            try:
                props = dict(entity) if hasattr(entity, '__iter__') else {}
            except:
                props = {}
            
            # Safely get labels
            labels = []
            if hasattr(entity, 'labels'):
                try:
                    labels = list(entity.labels)
                except:
                    pass
            
            first_label = labels[0] if labels else None
            return props.get('name') or props.get('label') or first_label or props.get('id') or str(id_of(entity) or '')

        with neo4j.driver.session(database=DBNAME) as session:
            result = session.run(query)
            for rec in result:
                d = rec.get("d")
                r = rec.get("r")
                d2 = rec.get("d2")

                dId = id_of(d)
                if d and dId is not None and dId not in nodes_map:
                    # Safely extract properties
                    try:
                        d_props = dict(d) if d else {}
                    except:
                        d_props = {}
                    
                    nodes_map[dId] = {
                        "id": dId,
                        "label": label_of(d),
                        "elementId": getattr(d, 'element_id', None),
                        "group": "Device",
                        "title": str(d_props),
                        "shape": "dot",
                        "size": 12,
                        "color": {"background": "#2B7CE9", "border": "#205AAA"}
                    }

                if d2:
                    d2Id = id_of(d2)
                    if d2Id is not None and d2Id not in nodes_map:
                        # Safely extract properties
                        try:
                            d2_props = dict(d2) if d2 else {}
                        except:
                            d2_props = {}
                        
                        nodes_map[d2Id] = {
                            "id": d2Id,
                            "label": label_of(d2),
                            "elementId": getattr(d2, 'element_id', None),
                            "group": "Device",
                            "title": str(d2_props),
                            "shape": "dot",
                            "size": 12,
                            "color": {"background": "#2B7CE9", "border": "#205AAA"}
                        }
                    if r and dId is not None and d2Id is not None:
                        a, b = min(dId, d2Id), max(dId, d2Id)
                        edgeKey = f"{a}-{b}"
                        if edgeKey not in edges_map:
                            edges_map[edgeKey] = {
                                "id": edgeKey,
                                "from": a,
                                "to": b,
                                "color": {"color": "#848484"},
                                "width": 1
                            }
        return JSONResponse(content={
            "nodes": list(nodes_map.values()),
            "edges": list(edges_map.values())
        })
    finally:
        neo4j.close()


@app.get("/neo4j/attack-graph")
def get_attack_graph(deviceElementId: str = Query(..., description="선택된 device의 elementId")):
    """
    공격 그래프(노드/엣지) 반환. deviceElementId는 반드시 전달해야 함.
    """
    print(f"[attack-graph] Received deviceElementId: {deviceElementId}")
    neo4j = Neo4jConnector(URI, USERNAME, PASSWORD)
    
    def id_of(entity):
        if not entity:
            return None
        if hasattr(entity, 'id'):
            idval = entity.id
            if hasattr(idval, '__int__'):
                return int(idval)
            return idval
        return None
    
    def label_of(entity):
        if not entity:
            return ""
        try:
            props = dict(entity) if hasattr(entity, '__iter__') else {}
        except:
            props = {}
        
        labels = []
        if hasattr(entity, 'labels'):
            try:
                labels = list(entity.labels)
            except:
                pass
        
        first_label = labels[0] if labels else None
        return props.get('name') or props.get('label') or first_label or props.get('id') or str(id_of(entity) or '')
    
    try:
        # deviceElementId로 노드 찾기 (element_id 또는 id 속성)
        query_find_target = '''
            MATCH (target:Device {project: 'facility'})
            WHERE elementId(target) = $elementId OR target.id = $elementId
            RETURN target
            LIMIT 1
        '''
        
        target_node = None
        with neo4j.driver.session(database=DBNAME) as session:
            result = session.run(query_find_target, elementId=deviceElementId)
            record = result.single()
            if record:
                target_node = record.get("target")
                print(f"[attack-graph] Found target node")
        
        if not target_node:
            print(f"[attack-graph] No target node found for deviceElementId: {deviceElementId}")
            return JSONResponse(content={
                "nodes": [],
                "edges": [],
                "allStartNodes": [],
                "targetNodeId": None,
                "error": f"No target node found for: {deviceElementId}"
            })
        
        targetId = id_of(target_node)
        print(f"[attack-graph] Target node ID: {targetId}")
        
        # 연결된 노드들 찾기
        query = '''
            MATCH (target:Device {project: 'facility'})
            WHERE id(target) = $targetId
            MATCH (start:Device {project: 'facility'})-[:CONNECTED*1..3]-(target)
            WHERE start <> target
            RETURN DISTINCT start, target
            LIMIT 50
        '''
        
        nodes_map = {}
        allStartNodes = set()
        
        with neo4j.driver.session(database=DBNAME) as session:
            result = session.run(query, targetId=targetId)
            
            # target 노드 먼저 추가
            try:
                target_props = dict(target_node) if target_node else {}
            except:
                target_props = {}
            
            nodes_map[targetId] = {
                "id": targetId,
                "label": label_of(target_node),
                "group": "TargetPhysical",
                "title": str(target_props),
                "shape": "dot",
                "size": 25,
                "color": {"background": "#FF0000", "border": "#CC0000"},
                "properties": target_props
            }
            
            for rec in result:
                start = rec.get("start")
                startId = id_of(start)
                
                if startId and startId not in nodes_map:
                    allStartNodes.add(startId)
                    try:
                        start_props = dict(start) if start else {}
                    except:
                        start_props = {}
                    
                    nodes_map[startId] = {
                        "id": startId,
                        "label": label_of(start),
                        "group": "StartPhysical",
                        "title": str(start_props),
                        "shape": "dot",
                        "size": 20,
                        "color": {"background": "#00FF00", "border": "#00CC00"},
                        "properties": start_props
                    }
            
            # 엣지 생성 (모든 start 노드를 target에 연결)
            edges = []
            for startId in allStartNodes:
                edgeKey = f"{min(startId, targetId)}-{max(startId, targetId)}"
                edges.append({
                    "id": edgeKey,
                    "from": startId,
                    "to": targetId,
                    "color": {"color": "#848484"},
                    "width": 2,
                    "title": "Connected"
                })
        
        result_data = {
            "nodes": list(nodes_map.values()),
            "edges": edges,
            "allStartNodes": list(allStartNodes),
            "targetNodeId": targetId
        }
        print(f"[attack-graph] Returning {len(result_data['nodes'])} nodes and {len(result_data['edges'])} edges")
        print(f"[attack-graph] Start nodes: {allStartNodes}")
        print(f"[attack-graph] Target node ID: {targetId}")
        
        return JSONResponse(content=result_data)
    finally:
        neo4j.close()

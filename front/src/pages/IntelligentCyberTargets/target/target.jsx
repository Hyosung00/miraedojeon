import React, { useState, useEffect } from 'react';

const Target = ({ dbMessage }) => {
  const [data, setData] = useState(null);



  const displayData = dbMessage || {
    message: "New Target Component with hardcoded data",
  };

  return <div>{displayData.message}</div>;
};

export default Target;
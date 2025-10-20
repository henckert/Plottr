export default function Health() {
  return (
    <div style={{padding: 20, fontFamily: "sans-serif"}}>
      <h1>UI OK</h1>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>Next.js is running successfully!</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import './App.css';
import ApplicationsTable, { type Application } from './components/ApplicationsTable';

export default function App() {

  const [data, setData] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/applications');

        if (!response.ok) {
          throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const result = (await response.json()) as Application[];
        setData(result);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An unknown error has occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteSuccess = (applicationId: number) => {
    setData((prev) => prev.filter((data) => data.application_id != applicationId));
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <header className="appHeader">
        <h1>Co-op Application Tracker</h1>
      </header>

      <main>
        <ApplicationsTable rows={data} onDeleteSuccess={handleDeleteSuccess} />
      </main>
    </>
  );
}

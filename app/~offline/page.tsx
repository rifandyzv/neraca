import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

export default function Page() {
  return (
    <>
      <header>
        <img className="icon" src="/icons/icon.svg" alt="Neraca" height="40" />
      </header>
      <main>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '80vh',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1>You're Offline</h1>
          <p>Neraca works offline! Please check your internet connection and try again.</p>
          <p>You can still access your previously saved data when offline.</p>
        </div>
      </main>
    </>
  );
}
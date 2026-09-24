import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./sections/Hero";
import { Features } from "./sections/Features";
import { HowItWorks } from "./sections/HowItWorks";
import { NetworkingConcepts } from "./sections/NetworkingConcepts";
import { TechStack } from "./sections/TechStack";
import { Downloads } from "./sections/Downloads";
import { HowToDemo } from "./sections/HowToDemo";
import { Limitations } from "./sections/Limitations";
import { GitHubSection } from "./sections/GitHubSection";
import { DeveloperSection } from "./sections/DeveloperSection";
import { Footer } from "./components/Footer";

export const App: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Hero />
        <Features />
        <HowItWorks />
        <NetworkingConcepts />
        <TechStack />
        <Downloads />
        <HowToDemo />
        <Limitations />
        <GitHubSection />
        <DeveloperSection />
      </main>
      <Footer />
    </div>
  );
};

export default App;

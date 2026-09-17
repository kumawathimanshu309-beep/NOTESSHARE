import React from "react";

import Navbar from "../Components/Navbar";
import Hero from "../Components/Hero";
import Stats from "../Components/Stats";
import Features from "../Components/Features";
import Explore from "../Components/Explore";
import Join from "../Components/Join";
import Footer from "../Components/Footer";

const Home = () => {
  return (
    <div className="app">

      <Navbar />

      <main>
        <Hero />
        <Stats />
        <Features />
        <Explore />
        <Join />
      </main>

      <Footer />

    </div>
  );
};

export default Home;
import React from 'react'

const Navbar = () => {
  return (
    <div> 
         <nav className="navbar">
        <div className="nav-container">

          <a href="#" className="logo">
             <img 
             className="w-10 h-10"
             src="/logo.png" alt="" />

            <span>
              Study<span className="logo-purple">Share</span>
            </span>
          </a>

          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#explore">Explore</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
          </div>

          <div className="nav-actions">
            <a href="#" className="login">
              Log in
            </a>

            <a href="#" className="nav-button">
              Get Started
            </a>
          </div>

          <button className="mobile-menu">
            ☰
          </button>

        </div>
      </nav>
    </div>
  )
}

export default Navbar
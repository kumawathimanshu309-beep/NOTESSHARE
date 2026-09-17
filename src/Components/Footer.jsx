import React from 'react'

const Footer = () => {
  return (
    <div> 
        <footer id="about">

        <div className="footer-container">

          <div className="footer-brand">

            <a href="#" className="logo">

              <img
                className="w-10 h-10"
                src="/logo.png" alt="" />

              <span>
                Study<span className="logo-purple">
                  Share
                </span>
              </span>

            </a>

            <p>
              Share knowledge. Discover better notes.
            </p>

          </div>


          <div className="footer-links">

            <div>
              <h4>Platform</h4>
              <a href="#">Explore</a>
              <a href="#">Upload Notes</a>
              <a href="#">Subjects</a>
            </div>

            <div>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Contact</a>
              <a href="#">Privacy</a>
            </div>

            <div>
              <h4>Social</h4>
              <a href="#">Instagram</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
            </div>

          </div>

        </div>


        <div className="footer-bottom">
          <span>
            © 2026 StudyShare. All rights reserved.
          </span>

          <span>
            Made for students.
          </span>
        </div>

      </footer>
    </div>
  )
}

export default Footer
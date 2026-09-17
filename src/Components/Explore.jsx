import React from 'react'

const Explore = () => {
  return (
    <div> 

        <section className="explore-section" id="explore">

          <div className="explore-content">

            <div className="section-badge">
              EXPLORE
            </div>

            <h2>
              Find the notes you
              <span className="gradient-text">
                {" "}need.
              </span>
            </h2>

            <p>
              Browse notes by subject, semester or category
              and find exactly what you're looking for.
            </p>

            <a href="#" className="primary-button">
              Explore Notes
              <span>→</span>
            </a>

          </div>


          <div className="subject-grid">

            <div className="subject-card purple-card">
              <span>⌘</span>
              <strong>Computer Science</strong>
              <small>2,480 notes</small>
            </div>

            <div className="subject-card">
              <span>∑</span>
              <strong>Mathematics</strong>
              <small>1,920 notes</small>
            </div>

            <div className="subject-card">
              <span>⚗</span>
              <strong>Science</strong>
              <small>1,640 notes</small>
            </div>

            <div className="subject-card">
              <span>◈</span>
              <strong>Engineering</strong>
              <small>2,210 notes</small>
            </div>

          </div>

        </section>
    </div>
  )
}

export default Explore
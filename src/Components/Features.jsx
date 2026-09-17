import React from 'react'

const Features = () => {

    const features = [
  {
    icon: "⌕",
    title: "Find Notes Faster",
    description:
      "Search and discover useful notes, study materials and resources in seconds.",
  },
  {
    icon: "↗",
    title: "Share Your Knowledge",
    description:
      "Upload your notes and help other students learn from your work.",
  },
  {
    icon: "★",
    title: "Quality Resources",
    description:
      "Discover highly-rated notes shared by students from different subjects.",
  },
];
  return (
    <div> 
         <section className="features-section" id="features">

          <div className="section-heading">

            <div className="section-badge">
              WHY STUDYSHARE
            </div>

            <h2>
              Everything you need to
              <span className="gradient-text">
                {" "}study smarter.
              </span>
            </h2>

            <p>
              A simple platform designed to make sharing
              and discovering notes effortless.
            </p>

          </div>


          <div className="features-grid">

            {features.map((feature, index) => (

              <div className="feature-card" key={index}>

                <div className="feature-icon">
                  {feature.icon}
                </div>

                <h3>
                  {feature.title}
                </h3>

                <p>
                  {feature.description}
                </p>

                <a href="#">
                  Learn more →
                </a>

              </div>

            ))}

          </div>

        </section>
    </div>
  )
}

export default Features
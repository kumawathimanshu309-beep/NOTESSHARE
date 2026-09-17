import React from 'react'

const Hero = () => {


    const notes = [
        {
            title: "Computer Graphics",
            subject: "Engineering",
            downloads: "2.4k",
            rating: "4.9",
            icon: "◈",
        },
        {
            title: "Data Structures",
            subject: "Computer Science",
            downloads: "3.1k",
            rating: "4.8",
            icon: "⌘",
        },
        {
            title: "Operating Systems",
            subject: "Computer Science",
            downloads: "1.8k",
            rating: "4.9",
            icon: "◉",
        },
    ];
    return (
        <div>

            <section className="hero" id="home">

                <div className="hero-glow glow-one"></div>
                <div className="hero-glow glow-two"></div>

                <div className="hero-content">

                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        A better way to share knowledge
                    </div>

                    <h1>
                        Share Knowledge
                        <br />

                        <span className="gradient-text">
                            Discover Better Notes
                        </span>
                    </h1>

                    <p className="hero-description">
                        StudyShare is a modern platform where students can
                        discover, organize and share high-quality study notes
                        with each other.
                    </p>

                    <div className="hero-buttons">

                        <a href="#explore" className="primary-button">
                            Explore Notes
                            <span>→</span>
                        </a>

                        <a href="#share" className="secondary-button">
                            Share Your Notes
                        </a>

                    </div>

                    <div className="hero-trust">
                        <div className="avatars">
                            <span>A</span>
                            <span>R</span>
                            <span>S</span>
                            <span>+</span>
                        </div>

                        <div>
                            <div className="stars">
                                ★★★★★
                            </div>

                            <p>
                                Built for students, by students
                            </p>
                        </div>
                    </div>

                </div>





                <div className="dashboard-wrapper">

                    <div className="dashboard-glow"></div>

                    <div className="dashboard">

                        <div className="dashboard-top">

                            <div className="fake-window-buttons">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>

                            <div className="fake-search">
                                <span>⌕</span>
                                Search notes...
                            </div>

                            <div className="profile-circle">
                                A
                            </div>

                        </div>


                        <div className="dashboard-body">

                            <aside className="sidebar">

                                <div className="side-item active">
                                    <span>⌂</span>
                                    Overview
                                </div>

                                <div className="side-item">
                                    <span>◫</span>
                                    Explore
                                </div>

                                <div className="side-item">
                                    <span>↥</span>
                                    My Notes
                                </div>

                                <div className="side-item">
                                    <span>♡</span>
                                    Saved
                                </div>

                            </aside>


                            <div className="dashboard-main">

                                <div className="dashboard-heading">

                                    <div>
                                        <p className="small-label">
                                            STUDYSPACE
                                        </p>

                                        <h3>
                                            Welcome back, Ankit
                                        </h3>
                                    </div>

                                    <button className="upload-button">
                                        + Upload Note
                                    </button>

                                </div>


                                <div className="mini-stats">

                                    <div className="mini-stat">
                                        <span>Notes Saved</span>
                                        <strong>24</strong>
                                    </div>

                                    <div className="mini-stat">
                                        <span>Notes Shared</span>
                                        <strong>18</strong>
                                    </div>

                                    <div className="mini-stat">
                                        <span>Downloads</span>
                                        <strong>1.2k</strong>
                                    </div>

                                </div>


                                <div className="preview-title">
                                    Popular Notes
                                </div>


                                <div className="preview-notes">

                                    {notes.map((note, index) => (

                                        <div className="preview-note" key={index}>

                                            <div className="note-icon">
                                                {note.icon}
                                            </div>

                                            <div className="note-info">
                                                <strong>
                                                    {note.title}
                                                </strong>

                                                <span>
                                                    {note.subject}
                                                </span>
                                            </div>

                                            <div className="note-rating">
                                                ★ {note.rating}
                                            </div>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>
        </div>
    )
}

export default Hero
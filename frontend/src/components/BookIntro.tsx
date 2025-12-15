import React, { CSSProperties, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sb_book_intro_shown';
const STAR_COUNT = 18;

const BookIntro: React.FC = () => {
  const [visible, setVisible] = useState(false);

  const stars = useMemo(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
    }));
  }, []);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(STORAGE_KEY) === '1';
    if (alreadySeen) {
      return;
    }

    const showTimeout = window.setTimeout(() => {
      setVisible(true);
    }, 150);

    const hideTimeout = window.setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, '1');
    }, 3200);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="book-intro-backdrop" aria-hidden="true">
      <div className="book-intro-stars">
        {stars.map((star, index) => (
          <span
            key={index}
            className="book-intro-star"
            style={{
              '--star-x': star.left,
              '--star-y': star.top,
              '--star-delay': `${index * 0.12}s`,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="book-intro-glow" />

      <div className="book-intro" role="presentation">
        <div className="book-intro-cover book-intro-cover--front">
          <div className="book-intro-crest">SB</div>
          <div className="book-intro-title">
            <span className="book-intro-title__subtitle">Once upon a study night</span>
            <span className="book-intro-title__main">StudyBuddy</span>
            <span className="book-intro-title__tag">Where every question finds its guide</span>
          </div>
          <div className="book-intro-ribbon" />
        </div>

        <div className="book-intro-spine" />

        <div className="book-intro-pages">
          <div className="book-page book-page--1" />
          <div className="book-page book-page--2" />
          <div className="book-page book-page--3" />
          <div className="book-page book-page--4" />
          <div className="book-page book-page--5" />
        </div>

        <div className="book-intro-cover book-intro-cover--back" />
      </div>

      <p className="book-intro-tagline">Open your next chapter with StudyBuddy</p>
    </div>
  );
};

export default BookIntro;

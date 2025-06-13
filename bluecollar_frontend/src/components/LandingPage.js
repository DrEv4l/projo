// src/components/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div>
      <h1>Welcome to Blue Collar Services!</h1>
      <p>Connect with skilled professionals for your home and business needs.</p>
      <div>
        {/* These are illustrative. You might have more prominent buttons in your design. */}
        <p>
          Ready to get started?{" "}
          <Link to="/signup" className="btn btn-primary">Sign Up</Link>
        </p>
        <p>
          Already have an account?{" "}
          <Link to="/login" className="btn btn-secondary">Login</Link>
        </p>
      </div>
      {/* You can list some service categories here later */}
      <h2>Services We Offer (Example)</h2>
      <ul>
        <li>Plumbing</li>
        <li>Electrical</li>
        <li>Cleaning</li>
        <li>Handyman Services</li>
      </ul>
    </div>
  );
};

export default LandingPage;
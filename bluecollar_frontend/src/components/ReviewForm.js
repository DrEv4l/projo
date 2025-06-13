// File: src/components/ReviewForm.js
import React, { useState } from 'react';
import apiClient from '../api/axiosConfig'; 

const ReviewForm = ({ bookingId, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0); // Initial rating, 0 means not selected
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleStarClick = (rate) => {
        setRating(rate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Please select a rating (1-5 stars).');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            await apiClient.post(`/bookings/${bookingId}/review/`, {
                rating: rating, // Only rating and comment are needed in the POST body
                comment: comment,
            });
            setSubmitting(false);
            if (onReviewSubmitted) {
                onReviewSubmitted(bookingId); // Callback to parent
            }
            setRating(0); // Reset form after successful submission
            setComment('');
            alert('Review submitted successfully!');
        } catch (err) {
            setSubmitting(false);
            const errorMessage = err.response?.data?.detail ||
                                 (err.response?.data?.rating && `Rating: ${err.response.data.rating.join(' ')}`) ||
                                 (err.response?.data?.comment && `Comment: ${err.response.data.comment.join(' ')}`) ||
                                 'Failed to submit review. Please try again.';
            setError(errorMessage);
            console.error("Review submission error:", err.response?.data || err.message);
        }
    };

    return (
        <div className="review-form" style={{ border: '1px solid #ddd', padding: '20px', marginTop: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h4>Leave a Review</h4>
            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Your Rating:</label>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            onClick={() => handleStarClick(star)}
                            style={{ cursor: 'pointer', color: star <= rating ? 'gold' : 'lightgray', fontSize: '30px', marginRight: '5px' }}
                            title={`${star} star${star > 1 ? 's' : ''}`}
                        >
                            ★
                        </span>
                    ))}
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor={`comment-${bookingId}`} style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Comment (Optional):</label>
                    <textarea
                        id={`comment-${bookingId}`}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows="4"
                        style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
                        placeholder="Share your experience with this provider..."
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    style={{
                        padding: '10px 20px',
                        cursor: (submitting || rating === 0) ? 'not-allowed' : 'pointer',
                        backgroundColor: (submitting || rating === 0) ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px'
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </form>
        </div>
    );
};

export default ReviewForm;
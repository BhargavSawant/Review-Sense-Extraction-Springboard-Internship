//sentiment-app\frontend\src\components\ReviewForm.jsx
import { useState } from 'react';

export function ReviewForm({ productId }) {
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!review.trim()) return;

    setLoading(true);
    try {
      await sentimentApi.saveReview({
        text: review,
        product_id: productId,
      });
      setSuccess(true);
      setReview('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submitReview} className="space-y-4">
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write your review..."
        className="w-full p-4 border rounded-lg"
        rows={4}
        required
      />
      
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
          Review submitted successfully!
        </div>
      )}
    </form>
  );
}

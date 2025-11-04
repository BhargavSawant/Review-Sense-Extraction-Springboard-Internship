import re
from collections import Counter

class SentimentAnalyzer:
    def __init__(self):
        # Positive keywords
        self.positive_words = {
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'love', 'happy', 'joy', 'beautiful', 'perfect', 'best', 'awesome',
            'brilliant', 'exceptional', 'outstanding', 'superb', 'delightful',
            'pleased', 'satisfied', 'enjoy', 'fortunate', 'blessed', 'excited',
            'marvelous', 'incredible', 'fabulous', 'terrific', 'positive',
            'success', 'win', 'victory', 'celebrate', 'optimistic', 'hopeful'
        }
        
        # Negative keywords
        self.negative_words = {
            'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'hate',
            'sad', 'unhappy', 'disappointed', 'unfortunate', 'negative',
            'angry', 'frustrated', 'annoyed', 'disgust', 'ugly', 'nasty',
            'pathetic', 'useless', 'worthless', 'fail', 'failure', 'loss',
            'defeat', 'worry', 'fear', 'afraid', 'concern', 'problem',
            'issue', 'difficult', 'hard', 'painful', 'hurt', 'damage'
        }
    
    def preprocess_text(self, text):
        """Convert text to lowercase and extract words"""
        text = text.lower()
        words = re.findall(r'\b\w+\b', text)
        return words
    
    def analyze(self, text):
        """Analyze sentiment of the given text"""
        words = self.preprocess_text(text)
        
        # Find positive and negative words in the text
        found_positive = [w for w in words if w in self.positive_words]
        found_negative = [w for w in words if w in self.negative_words]
        
        # Calculate sentiment scores
        positive_count = len(found_positive)
        negative_count = len(found_negative)
        total_sentiment_words = positive_count + negative_count
        
        # Determine sentiment
        if total_sentiment_words == 0:
            sentiment = "neutral"
            score = 0.0
        elif positive_count > negative_count:
            sentiment = "positive"
            score = round(positive_count / total_sentiment_words, 2)
        elif negative_count > positive_count:
            sentiment = "negative"
            score = round(negative_count / total_sentiment_words, 2)
        else:
            sentiment = "neutral"
            score = 0.5
        
        return {
            "text": text,
            "sentiment": sentiment,
            "score": score,
            "positive_words": list(set(found_positive)),
            "negative_words": list(set(found_negative))
        }
# backend/keybert_absa.py
# Enhanced ABSA System with Adaptive Length Handling

from keybert import KeyBERT
from transformers import pipeline
from collections import Counter
import re
from difflib import SequenceMatcher

class SimplifiedABSA:
    """
    Enhanced aspect extraction with length-adaptive rules
    """
    
    def __init__(self, sentiment_model_path="./my_finetuned_sentiment_model"):
        print("Initializing Enhanced KeyBERT ABSA System...")
        
        self.keybert = KeyBERT(model='all-MiniLM-L6-v2')
        self.sentiment_model = pipeline("sentiment-analysis", model=sentiment_model_path)
        
        # Expanded stopwords - words that are NEVER aspects
        self.non_aspect_words = {
            # Adjectives/Adverbs
            'really', 'very', 'quite', 'extremely', 'pretty', 'fairly', 'rather',
            'actually', 'definitely', 'absolutely', 'totally', 'completely',
            'easily', 'quickly', 'slowly', 'barely', 'hardly', 'nearly',
            
            # Time/frequency
            'always', 'never', 'sometimes', 'often', 'rarely', 'late', 'early',
            'days', 'hours', 'minutes', 'weeks', 'months', 'years', 'day',
            'yesterday', 'today', 'tomorrow', 'soon', 'later',
            
            # Vague descriptors
            'minor', 'major', 'several', 'few', 'many', 'issues', 'issue',
            'things', 'thing', 'stuff', 'items', 'item', 'problems', 'problem',
            
            # Generic quality words
            'good', 'bad', 'great', 'poor', 'nice', 'okay', 'fine', 'excellent',
            'better', 'worse', 'best', 'worst', 'overall', 'balanced',
            'impressive', 'disappointing', 'decent', 'terrible', 'amazing',
            
            # Verbs
            'looks', 'feels', 'seems', 'appears', 'arrives', 'works', 'lasts',
            'does', 'doesn', 'don', 'isn', 'aren', 'wasn', 'weren',
            
            # Modals/Negations
            'not', 'no', 'yes', 'can', 'could', 'should', 'would', 'will',
            'consistent', 'inconsistent', 'reliable', 'unreliable'
        }
        
        # Core aspect keywords (MUST contain at least one)
        self.core_aspect_terms = {
            'battery', 'screen', 'display', 'camera', 'sound', 'audio', 'video',
            'performance', 'quality', 'price', 'cost', 'value', 'design', 'build',
            'material', 'durability', 'delivery', 'shipping', 'package', 'service',
            'support', 'warranty', 'feature', 'functionality', 'app', 'software',
            'hardware', 'interface', 'fitness', 'health', 'tracking', 'monitor',
            'sensor', 'gps', 'comfort', 'fit', 'weight', 'size', 'style',
            'notification', 'alert', 'call', 'message', 'connectivity', 'bluetooth',
            'wifi', 'charging', 'charger', 'cable', 'adapter', 'port', 'usb',
            'strap', 'band', 'watch', 'smartwatch', 'amoled', 'lcd', 'sync',
            'syncing', 'waterproof', 'resistant', 'heart', 'rate', 'steps'
        }
        
        print("Enhanced ABSA System ready!\n")
    
    def get_review_length_category(self, text: str) -> str:
        """
        Categorize review by length for adaptive filtering
        
        Returns: 'short', 'medium', or 'long'
        """
        word_count = len(text.split())
        
        if word_count < 30:
            return 'short'
        elif word_count < 100:
            return 'medium'
        else:
            return 'long'
    
    def similarity_ratio(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings"""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    def contains_core_aspect(self, text: str) -> bool:
        """Check if text contains at least one core aspect term"""
        words = set(text.lower().split())
        return bool(words & self.core_aspect_terms)
    
    def is_valid_aspect(self, keyword: str, length_category: str = 'medium') -> bool:
        """
        Adaptive validation based on review length
        
        Args:
            keyword: The aspect candidate
            length_category: 'short', 'medium', or 'long'
        """
        keyword_lower = keyword.lower().strip()
        words = keyword_lower.split()
        
        # Rule 1: Length check
        if len(keyword_lower) < 4 or len(keyword_lower) > 35:
            return False
        
        # Rule 2: Core aspect requirement (RELAXED for short reviews)
        has_core_aspect = self.contains_core_aspect(keyword_lower)
        
        if length_category == 'short':
            # For short reviews, be more lenient - allow if any word is meaningful
            if not has_core_aspect:
                # Check if at least one word is NOT a stopword
                if not any(word not in self.non_aspect_words for word in words):
                    return False
        else:
            # For medium/long reviews, require core aspect
            if not has_core_aspect:
                return False
        
        # Rule 3: Single word validation (RELAXED for short reviews)
        if len(words) == 1:
            if length_category == 'short':
                # Allow any non-stopword single word in short reviews
                return keyword_lower not in self.non_aspect_words
            else:
                # Strict: must be core aspect term
                return keyword_lower in self.core_aspect_terms
        
        # Rule 4: Cannot be entirely non-aspect words
        if all(word in self.non_aspect_words for word in words):
            return False
        
        # Rule 5: Non-aspect word ratio (ADAPTIVE)
        non_aspect_count = sum(1 for word in words if word in self.non_aspect_words)
        
        if length_category == 'short':
            max_ratio = 0.6  # More lenient for short reviews
        else:
            max_ratio = 0.5  # Stricter for longer reviews
        
        if non_aspect_count / len(words) > max_ratio:
            return False
        
        # Rule 6: Edge word check (RELAXED for short reviews)
        if length_category != 'short':
            # Only apply to medium/long reviews
            if words[0] in self.non_aspect_words or words[-1] in self.non_aspect_words:
                return False
        
        return True
    
    def clean_aspect(self, keyword: str) -> str:
        """Clean and normalize aspect"""
        words = keyword.split()
        
        # Remove non-aspect words from edges
        while words and words[0].lower() in self.non_aspect_words:
            words.pop(0)
        while words and words[-1].lower() in self.non_aspect_words:
            words.pop()
        
        cleaned = ' '.join(words)
        
        # Normalize common variations
        replacements = {
            'amoled display': 'display',
            'battery life': 'battery',
            'fitness tracking': 'fitness',
            'notification syncing': 'notifications',
            'build quality': 'build',
        }
        
        for old, new in replacements.items():
            if old in cleaned.lower():
                return new
        
        return cleaned
    
    def deduplicate_aspects(self, aspects: list) -> list:
        """
        Intelligent deduplication:
        - Remove similar/overlapping aspects
        - Keep shorter, more general terms
        """
        if not aspects:
            return []
        
        # Sort by relevance score (descending) and length (ascending)
        aspects.sort(key=lambda x: (-x['relevance_score'], len(x['keyword'])))
        
        deduplicated = []
        seen_keywords = set()
        
        for aspect in aspects:
            keyword = aspect['keyword'].lower()
            
            # Skip if exact duplicate
            if keyword in seen_keywords:
                continue
            
            # Check similarity with existing aspects
            is_duplicate = False
            for existing in deduplicated:
                existing_keyword = existing['keyword'].lower()
                
                # Case 1: One is substring of another
                if keyword in existing_keyword or existing_keyword in keyword:
                    # Keep the shorter one (more general)
                    if len(keyword) < len(existing_keyword):
                        deduplicated.remove(existing)
                        break
                    else:
                        is_duplicate = True
                        break
                
                # Case 2: High text similarity (> 70%)
                if self.similarity_ratio(keyword, existing_keyword) > 0.7:
                    # Keep the one with higher relevance or shorter length
                    if (aspect['relevance_score'] > existing['relevance_score'] or 
                        len(keyword) < len(existing_keyword)):
                        deduplicated.remove(existing)
                        break
                    else:
                        is_duplicate = True
                        break
                
                # Case 3: Same words in different order
                words1 = set(keyword.split())
                words2 = set(existing_keyword.split())
                if words1 == words2:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                deduplicated.append(aspect)
                seen_keywords.add(keyword)
        
        return deduplicated
    
    def extract_aspects(self, text, top_n=8, use_mmr=True):
        """
        Extract aspects with adaptive filtering based on text length
        """
        try:
            # Determine review length category
            length_category = self.get_review_length_category(text)
            
            # Adaptive parameters based on length
            if length_category == 'short':
                candidates_n = min(top_n * 3, 20)  # Fewer candidates for short reviews
                diversity = 0.5  # Less diversity needed
                nr_candidates = 30
            elif length_category == 'medium':
                candidates_n = min(top_n * 4, 30)
                diversity = 0.6
                nr_candidates = 50
            else:  # long
                candidates_n = min(top_n * 4, 40)
                diversity = 0.7
                nr_candidates = 100
            
            # Extract keywords
            if use_mmr:
                keywords = self.keybert.extract_keywords(
                    text,
                    keyphrase_ngram_range=(1, 2),
                    stop_words='english',
                    top_n=candidates_n,
                    use_mmr=True,
                    diversity=diversity,
                    nr_candidates=nr_candidates
                )
            else:
                keywords = self.keybert.extract_keywords(
                    text,
                    keyphrase_ngram_range=(1, 2),
                    stop_words='english',
                    top_n=candidates_n,
                    use_maxsum=True,
                    nr_candidates=nr_candidates
                )
            
            # Filter valid aspects with length-adaptive rules
            valid_aspects = []
            for keyword, score in keywords:
                if not self.is_valid_aspect(keyword, length_category):
                    continue
                
                cleaned = self.clean_aspect(keyword)
                if not cleaned or len(cleaned) < 4:
                    continue
                
                valid_aspects.append({
                    "keyword": cleaned,
                    "relevance_score": round(score, 3)
                })
            
            # Deduplicate
            deduplicated = self.deduplicate_aspects(valid_aspects)
            
            # Adaptive top_n based on length
            if length_category == 'short':
                final_n = min(top_n // 2, len(deduplicated))  # Fewer aspects for short reviews
            else:
                final_n = min(top_n, len(deduplicated))
            
            return deduplicated[:final_n]
            
        except Exception as e:
            print(f"KeyBERT error: {e}")
            return []
    
    def extract_aspect_phrase(self, text, aspect, window_size=6):
        """
        Extract the specific phrase around the aspect (5-6 words)
        """
        text_lower = text.lower()
        aspect_lower = aspect.lower()
        
        # Find the aspect in text
        if aspect_lower not in text_lower:
            return text[:100]  # Fallback
        
        # Split into words while preserving positions
        words = text.split()
        words_lower = [w.lower() for w in words]
        
        # Find aspect position (handle multi-word aspects)
        aspect_words = aspect_lower.split()
        aspect_positions = []
        
        for i in range(len(words_lower) - len(aspect_words) + 1):
            # Check if aspect matches at this position
            match = True
            for j, aspect_word in enumerate(aspect_words):
                # Remove punctuation for matching
                word_clean = re.sub(r'[^\w\s]', '', words_lower[i + j])
                if aspect_word not in word_clean:
                    match = False
                    break
            if match:
                aspect_positions.append((i, i + len(aspect_words)))
        
        if not aspect_positions:
            return text[:100]  # Fallback
        
        # Use first occurrence
        start_idx, end_idx = aspect_positions[0]
        
        # Extract window around aspect
        before = max(0, start_idx - 3)  # 3 words before
        after = min(len(words), end_idx + 3)  # 3 words after
        
        phrase_words = words[before:after]
        phrase = ' '.join(phrase_words)
        
        # Clean up punctuation at edges
        phrase = phrase.strip('.,!?;: ')
        
        # Limit to reasonable length
        if len(phrase) > 80:
            phrase = phrase[:80] + "..."
        
        return phrase
    
    def analyze_aspect_sentiment(self, text, aspect):
        """Analyze sentiment for a specific aspect with context"""
        text_lower = text.lower()
        aspect_lower = aspect.lower()
        
        # Find sentence containing aspect
        sentences = text.replace('!', '.').replace('?', '.').split('.')
        context = ""
        
        for sentence in sentences:
            if aspect_lower in sentence.lower():
                context = sentence.strip()
                break
        
        if not context or len(context) < 5:
            context = text
        
        try:
            result = self.sentiment_model(context)[0]
            label_map = {
                'LABEL_0': 'negative',
                'LABEL_1': 'neutral',
                'LABEL_2': 'positive'
            }
            
            # Extract short phrase around aspect (5-6 words)
            short_phrase = self.extract_aspect_phrase(text, aspect)
            
            return {
                "sentiment": label_map.get(result['label'], 'neutral'),
                "confidence": round(result['score'], 3),
                "text_span": short_phrase
            }
        except Exception as e:
            print(f"Sentiment error: {e}")
            return None
    
    def analyze_single_review(self, text, top_n=8):
        """
        Analyze single review with adaptive aspect extraction
        """
        # Overall sentiment
        try:
            overall_result = self.sentiment_model(text)[0]
            label_map = {
                'LABEL_0': 'negative',
                'LABEL_1': 'neutral',
                'LABEL_2': 'positive'
            }
            overall_sentiment = label_map.get(overall_result['label'], 'neutral')
            overall_confidence = round(overall_result['score'], 3)
        except Exception as e:
            print(f"Overall sentiment error: {e}")
            overall_sentiment = 'neutral'
            overall_confidence = 0.5
        
        # Extract and deduplicate aspects (adaptive to length)
        aspects = self.extract_aspects(text, top_n=top_n)
        
        # Analyze sentiment for each aspect
        aspects_with_sentiment = []
        for aspect_data in aspects:
            sentiment_result = self.analyze_aspect_sentiment(text, aspect_data["keyword"])
            
            if sentiment_result:
                aspects_with_sentiment.append({
                    "aspect": aspect_data["keyword"],
                    "sentiment": sentiment_result["sentiment"],
                    "confidence": sentiment_result["confidence"],
                    "text_span": sentiment_result["text_span"],
                    "relevance_score": aspect_data["relevance_score"]
                })
        
        return {
            "overall_sentiment": overall_sentiment,
            "overall_confidence": overall_confidence,
            "aspects": aspects_with_sentiment,
            "total_aspects_found": len(aspects_with_sentiment)
        }
    
    def analyze_bulk_reviews(self, reviews, product_name, top_n=15):
        """
        Analyze multiple reviews with adjusted top_n
        """
        print(f"\n📊 Analyzing {len(reviews)} reviews for '{product_name}'...")
        
        combined_text = " ".join(reviews)
        
        print("  Extracting aspects...")
        global_aspects = self.extract_aspects(combined_text, top_n=top_n * 2)
        
        all_results = []
        aspect_aggregation = {}
        
        for i, review_text in enumerate(reviews):
            if i % 50 == 0 and i > 0:
                print(f"  Progress: {i}/{len(reviews)}")
            
            if len(review_text.strip()) == 0:
                continue
            
            # Use fewer aspects per review (5 instead of 10)
            result = self.analyze_single_review(review_text, top_n=5)
            
            all_results.append({
                "text": review_text,
                "overall_sentiment": result["overall_sentiment"],
                "overall_confidence": result["overall_confidence"],
                "aspects": result["aspects"]
            })
            
            for aspect_data in result["aspects"]:
                aspect = aspect_data["aspect"]
                
                if aspect not in aspect_aggregation:
                    aspect_aggregation[aspect] = {
                        "sentiments": [],
                        "confidences": [],
                        "relevance_scores": [],
                        "mentions": 0,
                        "sample_texts": []
                    }
                
                aspect_aggregation[aspect]["sentiments"].append(aspect_data["sentiment"])
                aspect_aggregation[aspect]["confidences"].append(aspect_data["confidence"])
                aspect_aggregation[aspect]["relevance_scores"].append(aspect_data["relevance_score"])
                aspect_aggregation[aspect]["mentions"] += 1
                
                if len(aspect_aggregation[aspect]["sample_texts"]) < 5:
                    aspect_aggregation[aspect]["sample_texts"].append(aspect_data["text_span"])
        
        print(f"✅ Analysis complete!")
        
        # Stricter filtering: 5% threshold instead of 3%
        aspects_summary = {}
        min_mentions = max(2, int(len(reviews) * 0.05))
        
        for aspect, data in aspect_aggregation.items():
            if data["mentions"] >= min_mentions:
                sentiment_counts = Counter(data["sentiments"])
                total = sum(sentiment_counts.values())
                
                aspects_summary[aspect] = {
                    "sentiment_distribution": {
                        "positive": sentiment_counts.get("positive", 0),
                        "neutral": sentiment_counts.get("neutral", 0),
                        "negative": sentiment_counts.get("negative", 0)
                    },
                    "percentages": {
                        "positive": round((sentiment_counts.get("positive", 0) / total) * 100, 1),
                        "neutral": round((sentiment_counts.get("neutral", 0) / total) * 100, 1),
                        "negative": round((sentiment_counts.get("negative", 0) / total) * 100, 1)
                    },
                    "avg_confidence": round(sum(data["confidences"]) / len(data["confidences"]), 2),
                    "avg_relevance": round(sum(data["relevance_scores"]) / len(data["relevance_scores"]), 2),
                    "mentions": data["mentions"],
                    "percentage_mentioned": round((data["mentions"] / len(reviews)) * 100, 1),
                    "sample_reviews": data["sample_texts"][:3]
                }
        
        overall_sentiments = [r["overall_sentiment"] for r in all_results]
        sentiment_counts = Counter(overall_sentiments)
        
        insights = self._generate_insights(aspects_summary, sentiment_counts, len(reviews))
        
        print(f"🎯 Found {len(aspects_summary)} significant aspects\n")
        
        return {
            "product_name": product_name,
            "total_reviews": len(all_results),
            "aspects_found": len(aspects_summary),
            "overall_sentiment": {
                "positive": sentiment_counts.get("positive", 0),
                "neutral": sentiment_counts.get("neutral", 0),
                "negative": sentiment_counts.get("negative", 0)
            },
            "overall_percentage": {
                "positive": round((sentiment_counts.get("positive", 0) / len(reviews)) * 100, 1),
                "neutral": round((sentiment_counts.get("neutral", 0) / len(reviews)) * 100, 1),
                "negative": round((sentiment_counts.get("negative", 0) / len(reviews)) * 100, 1)
            },
            "aspects": aspects_summary,
            "key_insights": insights
        }
    
    def _generate_insights(self, aspects_summary, sentiment_counts, total_reviews):
        """Generate insights from analysis"""
        insights = []
        
        if not aspects_summary:
            insights.append(f"Analyzed {total_reviews} reviews. No prominent aspects detected.")
            return insights
        
        most_mentioned = max(aspects_summary.items(), key=lambda x: x[1]["mentions"])
        insights.append(
            f"Most discussed: {most_mentioned[0].title()} "
            f"(mentioned in {most_mentioned[1]['percentage_mentioned']}% of reviews)"
        )
        
        positive_aspects = [
            (k, v) for k, v in aspects_summary.items() 
            if v["percentages"]["positive"] > 65 and v["mentions"] >= total_reviews * 0.05
        ]
        if positive_aspects:
            best = max(positive_aspects, key=lambda x: x[1]["percentages"]["positive"])
            insights.append(
                f"Most praised: {best[0].title()} "
                f"({int(best[1]['percentages']['positive'])}% positive)"
            )
        
        negative_aspects = [
            (k, v) for k, v in aspects_summary.items() 
            if v["percentages"]["negative"] > 40 and v["mentions"] >= total_reviews * 0.05
        ]
        if negative_aspects:
            worst = max(negative_aspects, key=lambda x: x[1]["percentages"]["negative"])
            insights.append(
                f"Needs improvement: {worst[0].title()} "
                f"({int(worst[1]['percentages']['negative'])}% negative)"
            )
        
        positive_pct = (sentiment_counts.get("positive", 0) / total_reviews) * 100
        if positive_pct > 70:
            insights.append(f"Overall: Highly recommended ({int(positive_pct)}% positive reviews)")
        elif positive_pct < 40:
            insights.append(f"Overall: Significant concerns ({int(positive_pct)}% positive reviews)")
        else:
            insights.append(f"Overall: Mixed feedback ({int(positive_pct)}% positive reviews)")
        
        insights.append(f"Detected {len(aspects_summary)} key aspects using adaptive filtering")
        
        return insights
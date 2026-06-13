import re
from typing import List

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split text into chunks of roughly chunk_size characters, ensuring sentences are not split.
    Overlap determines the approximate number of characters of previous text to carry over.
    """
    if not text:
        return []
    
    # Split text into sentences using simple regex
    # Handles common abbreviations, decimal numbers, and sentence ending punctuation
    sentence_endings = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s')
    sentences = sentence_endings.split(text)
    
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        sentence_len = len(sentence)
        
        # If a single sentence is larger than chunk_size, chunk it by words
        if sentence_len > chunk_size:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_length = 0
            
            words = sentence.split(" ")
            word_chunk = []
            word_chunk_len = 0
            for word in words:
                word_chunk.append(word)
                word_chunk_len += len(word) + 1
                if word_chunk_len >= chunk_size:
                    chunks.append(" ".join(word_chunk))
                    # Retain overlap words
                    overlap_words = word_chunk[-(max(1, int(overlap / 10))):]
                    word_chunk = list(overlap_words)
                    word_chunk_len = sum(len(w) + 1 for w in word_chunk)
            if word_chunk:
                chunks.append(" ".join(word_chunk))
            continue
            
        if current_length + sentence_len + 1 > chunk_size:
            # Save the current chunk
            chunks.append(" ".join(current_chunk))
            
            # Start a new chunk, carrying over some sentences to form the overlap
            overlap_chunk = []
            overlap_len = 0
            for s in reversed(current_chunk):
                if overlap_len + len(s) + 1 <= overlap:
                    overlap_chunk.insert(0, s)
                    overlap_len += len(s) + 1
                else:
                    break
            
            current_chunk = overlap_chunk
            current_length = overlap_len
            
        current_chunk.append(sentence)
        current_length += sentence_len + 1
        
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

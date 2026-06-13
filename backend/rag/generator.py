from typing import List, Dict, Any
from google import genai
from google.genai import types
from backend.config import settings
from backend.rag.embeddings import get_genai_client

class Generator:
    def __init__(self):
        self.client = get_genai_client()

    def generate_answer(
        self, 
        question: str, 
        context_chunks: List[Dict[str, Any]], 
        conversation_history: List[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a grounded answer using Gemini 2.5 Flash.
        Enforces answer constraints using system instruction and returns standard unavailability string if missing.
        """
        if not self.client:
            return "Gemini API key is not configured. Answer generation is disabled."
            
        # 1. Format the retrieved context
        formatted_context = ""
        for i, chunk in enumerate(context_chunks):
            metadata = chunk["metadata"]
            source_info = metadata.get("filename", "Unknown Source")
            formatted_context += f"--- Context Block [{i+1}] (Source: {source_info}, Chunk ID: {chunk['id']}) ---\n"
            formatted_context += f"{chunk['document']}\n\n"

        # 2. Build the system prompt
        system_instruction = (
            "You are a helpful AI assistant connected to a Slack Knowledge Base. "
            "Your task is to answer the user's question using ONLY the provided context blocks. "
            "Follow these rules strictly:\n"
            "1. Answer the question using ONLY the information present in the Context Blocks. "
            "Do NOT make up facts or use external knowledge.\n"
            "2. Cite your sources by appending the citation indices (e.g., [1], [2], [1, 3]) at the end of the sentences or sections where that information is derived.\n"
            "3. If the context blocks do NOT contain enough information to answer the user's question, "
            "you MUST reply exactly with: \"I could not find information in the available knowledge base.\" Do not add any explanation or other text."
        )

        # 3. Format the conversation history and current question
        prompt_content = "Context Blocks:\n"
        prompt_content += formatted_context
        prompt_content += "--------------------\n\n"
        
        if conversation_history:
            prompt_content += "Previous Conversation History:\n"
            for msg in conversation_history:
                role = "User" if msg["role"] == "user" else "Assistant"
                prompt_content += f"{role}: {msg['content']}\n"
            prompt_content += "\n"

        prompt_content += f"User's Question: {question}\n"
        prompt_content += "Answer:"

        try:
            response = self.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.0,  # Zero temperature for deterministic grounding
                    max_output_tokens=1000
                )
            )
            return response.text.strip() if response.text else "I could not find information in the available knowledge base."
        except Exception as e:
            # log the error or return error message gracefully
            print(f"Error during Gemini generation: {e}")
            return "I could not find information in the available knowledge base."

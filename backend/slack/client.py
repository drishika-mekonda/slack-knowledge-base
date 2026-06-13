from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from fastapi import HTTPException
from backend.config import settings

class SlackClientWrapper:
    def __init__(self):
        self.enabled = bool(settings.SLACK_BOT_TOKEN)
        if self.enabled:
            self.client = WebClient(token=settings.SLACK_BOT_TOKEN)
        else:
            self.client = None

    def check_enabled(self):
        if not self.enabled:
            raise HTTPException(
                status_code=400, 
                detail="Slack integration is disabled. Please configure SLACK_BOT_TOKEN in your environment."
            )

    def fetch_channel_messages(self, channel_id: str, limit: int = 100):
        """Fetch message history from a public or private channel."""
        self.check_enabled()
        try:
            response = self.client.conversations_history(
                channel=channel_id,
                limit=limit
            )
            return response.get("messages", [])
        except SlackApiError as e:
            if e.response['error'] == 'not_in_channel':
                try:
                    # Self-heal: Attempt to join public channel
                    self.client.conversations_join(channel=channel_id)
                    response = self.client.conversations_history(
                        channel=channel_id,
                        limit=limit
                    )
                    return response.get("messages", [])
                except Exception:
                    raise HTTPException(
                        status_code=400,
                        detail="The Slack Bot is not in this channel. Please invite it by typing '/invite @intelligent_kb_assist' inside the channel in Slack and try again."
                    )
            raise HTTPException(
                status_code=500,
                detail=f"Slack API error fetching channel history: {e.response['error']}"
            )

    def fetch_thread_messages(self, channel_id: str, thread_ts: str):
        """Fetch all messages (parent + replies) in a specific Slack thread."""
        self.check_enabled()
        try:
            response = self.client.conversations_replies(
                channel=channel_id,
                ts=thread_ts
            )
            return response.get("messages", [])
        except SlackApiError as e:
            if e.response['error'] == 'not_in_channel':
                try:
                    # Self-heal: Attempt to join public channel
                    self.client.conversations_join(channel=channel_id)
                    response = self.client.conversations_replies(
                        channel=channel_id,
                        ts=thread_ts
                    )
                    return response.get("messages", [])
                except Exception:
                    raise HTTPException(
                        status_code=400,
                        detail="The Slack Bot is not in this channel. Please invite it by typing '/invite @intelligent_kb_assist' inside the channel in Slack and try again."
                    )
            raise HTTPException(
                status_code=500,
                detail=f"Slack API error fetching thread: {e.response['error']}"
            )
            
    def get_channel_info(self, channel_id: str) -> str:
        """Fetch channel name from channel ID."""
        self.check_enabled()
        try:
            response = self.client.conversations_info(channel=channel_id)
            return response.get("channel", {}).get("name", channel_id)
        except Exception:
            return channel_id

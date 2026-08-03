import asyncio
from agent import root_agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

async def main():
    service = InMemorySessionService()
    await service.create_session("chatbot_template", "test", "test")
    runner = Runner(agent=root_agent, app_name="chatbot_template", session_service=service)
    
    content = types.Content(role="user", parts=[types.Part(text="Play rock paper scissors. I choose rock.")])
    tools_called = []
    
    async for event in runner.run_async(user_id="test", session_id="test", new_message=content):
        print(f"Event: {event}")
        if event.content and event.content.parts:
            for p in event.content.parts:
                if p.function_call:
                    print(f"Function call detected: {p.function_call.name}")
                    tools_called.append(p.function_call.name)
    print(f"Tools called: {tools_called}")

asyncio.run(main())

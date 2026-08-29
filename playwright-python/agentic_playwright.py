import os
import json
from google import genai
from playwright.sync_api import sync_playwright

client = genai.Client()

SYSTEM_PROMPT = """
You are an AI Browser Agent. You analyze the DOM text of a webpage and decide the single next step to achieve the goal.
Respond ONLY with a JSON object containing:
{
  "action": "goto" | "fill" | "click" | "finish",
  "selector": "CSS selector or URL",
  "text": "text to fill (optional)",
  "reasoning": "why you took this action"
}
"""

def agentic_login_demo():
    goal = "Log into Saucedemo with username 'standard_user' and password 'secret_sauce'."
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://www.saucedemo.com/")
        
        step = 0
        while step < 5:
            # Capture current DOM snapshot
            page_content = page.content()[:2000] # Pass snippet of page state to LLM
            
            prompt = f"Goal: {goal}\nCurrent URL: {page.url}\nPage HTML snippet: {page_content}"
            
            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config={'system_instruction': SYSTEM_PROMPT, 'response_mime_type': 'application/json'}
            )
            
            decision = json.loads(response.text)
            print(f"\n[Agent Thought]: {decision.get('reasoning')}")
            
            action = decision.get("action")
            if action == "fill":
                page.locator(decision["selector"]).fill(decision["text"])
            elif action == "click":
                page.locator(decision["selector"]).click()
            elif action == "finish":
                print("Goal Achieved!")
                break
                
            step += 1
            page.wait_for_timeout(1000)
            
        browser.close()

if __name__ == "__main__":
    agentic_login_demo()

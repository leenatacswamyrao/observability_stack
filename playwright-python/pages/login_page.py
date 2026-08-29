from playwright.sync_api import Page
class LoginPage: # encapsulates all selectors and their actions. If element id changes, here is where you change it too
    def __init__(self, page: Page): # constructor method that stores the active "page" instance & defines element locators as properties
        self.page = page
        self.username_input = page.locator("[data-test=\"username\"]")
        self.password_input = page.locator("[data-test=\"password\"]")
        self.login_button = page.locator("[data-test=\"login-button\"]")

    def navigate(self): # reusable action method
        self.page.goto("https://www.saucedemo.com/")

    def login(self, username: str, password: str): # reusable action method
        self.username_input.fill(username)
        self.password_input.fill(password)
        self.login_button.click()

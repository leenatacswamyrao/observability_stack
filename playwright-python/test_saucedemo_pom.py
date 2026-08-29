from playwright.sync_api import Page, expect # Page is an object representing single browser tab or popup window
#browser = chromium process running on machine
#browserContext = isolated incognito-mode like session inside browser
#Page = individual tab open inside that session in that browser
from pages.login_page import LoginPage

def test_successful_login(page: Page): # pytest recognizes test_ automatically. pytest passes page fixture which handles start and shut down browser instances
    login_page = LoginPage(page)
    login_page.navigate()
    login_page.login("standard_user", "secret_sauce")

# Assert user is redirected to inventory dashboard
    expect(page).to_have_url("https://www.saucedemo.com/inventory.html")

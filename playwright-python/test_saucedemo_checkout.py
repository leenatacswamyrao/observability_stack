import re
from playwright.sync_api import Page, expect


def test_saucedemo_checkout(page: Page) -> None:
    page.goto("https://www.saucedemo.com/")
    page.locator("[data-test=\"username\"]").click()
    page.locator("[data-test=\"username\"]").fill("standard_user")
    page.locator("[data-test=\"username\"]").press("Tab")
    page.locator("[data-test=\"password\"]").fill("secret_sauce")
    page.locator("[data-test=\"login-button\"]").click()
    page.locator("[data-test=\"add-to-cart-sauce-labs-backpack\"]").click()
    page.locator("[data-test=\"shopping-cart-link\"]").click()
    page.locator("[data-test=\"checkout\"]").click()
    page.locator("[data-test=\"firstName\"]").click()
    page.locator("[data-test=\"firstName\"]").fill("Leenata")
    page.locator("[data-test=\"firstName\"]").press("Tab")
    page.locator("[data-test=\"lastName\"]").fill("Swamyrao")
    page.locator("[data-test=\"lastName\"]").press("Tab")
    page.locator("[data-test=\"postalCode\"]").fill("400001")
    page.locator("[data-test=\"continue\"]").click()
    page.locator("[data-test=\"finish\"]").click()

    # Assert successful completion
    expect(page.locator("[data-test=\"complete-header\"]")).to_have_text("Thank you for your order!")
    #context.close()
   # browser.close()


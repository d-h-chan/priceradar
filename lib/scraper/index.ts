import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

// Given Amazon product URL, scrape desured data from the HTML
export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;
  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io:22225",
    port,
    rejectUnauthorized: false,
  };

  try {
    // 1. Fetch the product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    // 2. Extract product details
    const title = $("#productTitle").text().trim();

    const currentPrice = extractPrice(
      $("#corePrice_feature_div span.a-offscreen"),
      $(".priceToPay span.a-price-whole"),
      $(".a.size.base.a-color-price"),
      $(".a-button-selected .a-color-base")
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $("#priceblock_dealprice"),
      $(".a-size-base.a-color-price")
    );

    const outOfStock =
      $("#availability span").text().trim().toLowerCase() ===
      "currently unavailable";

    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));
    const currency = extractCurrency($(".a-price-symbol"));
    const discountRate = $(".savingsPercentage").text().replace(/[-%]/g, "");
    const description = extractDescription($);
    const reviewsCount = $("#acrCustomerReviewText")
      .text()
      .replace(/[^\d]/g, "");
    const stars = $("#averageCustomerReviews .a-size-base.a-color-base")
      .text()
      .trim();

    // 3. Construct data object with scraped information to store in db
    const data = {
      url,
      currency: currency || "$",
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: "category",
      reviewsCount: Number(reviewsCount),
      stars: Number(stars),
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(originalPrice),
    };

    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}

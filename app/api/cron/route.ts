import Product from "@/lib/models/product.models";
import { connectToDB } from "@/lib/mongoose";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import {
  getAveragePrice,
  getEmailNotifType,
  getHighestPrice,
  getLowestPrice,
} from "@/lib/utils";
import { NextResponse } from "next/server";

export const maxDuration = 10; // 5 minutes
export const dynamic = "force-dynamic"; // forces dynamic rendering and uncached data fetching
export const revalidate = 0;

export const GET = async () => {
  try {
    connectToDB();

    // get all products
    const products = await Product.find({});

    if (!products) throw new Error("No products found");

    // 1. Scrape latest product details & update DB for all products
    const updatedProducts = await Promise.all(
      products.map(async (dbProduct) => {
        const scrapedProduct = await scrapeAmazonProduct(dbProduct.url);

        if (!scrapedProduct) throw new Error("No product found");

        const updatedPriceHistory: any = [
          ...dbProduct.priceHistory,
          { price: scrapedProduct.currentPrice },
        ];

        const product = {
          ...scrapedProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        };

        const updatedProduct = await Product.findOneAndUpdate(
          { url: product.url },
          product
        );

        // 2. check each product's status & send emails if needed
        const emailNotifType = getEmailNotifType(scrapedProduct, dbProduct);

        if (emailNotifType && updatedProduct.users.length > 0) {
          const productInfo = {
            title: updatedProduct.title,
            url: updatedProduct.url,
          };

          const emailContent = await generateEmailBody(
            productInfo,
            emailNotifType
          );

          const userEmails = updatedProduct.users.map(
            (users: any) => userEmails.email
          );

          await sendEmail(emailContent, userEmails);
        }

        return updatedProduct;
      })
    );

    return NextResponse.json({
      message: "OK",
      data: updatedProducts,
    });
  } catch (error) {
    throw new Error(`Error in GET: ${error}`);
  }
};

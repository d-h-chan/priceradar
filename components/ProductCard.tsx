import { formatNumber } from "@/lib/utils";
import { Product } from "@/types";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface Props {
  product: Product;
}

// Card with product image and current price. Used on home page and product detail apge
const ProductCard = ({ product }: Props) => {
  return (
    <Link href={`/products/${product._id}`} className="product-card">
      <div className="product-card_img-container">
        <Image
          src={product.image}
          alt={product.title}
          width={200}
          height={200}
          className="product-card_img"
        />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="product">{product.title}</h3>
        <div className="flex justify-between">
          <p className="text-black text-lg font-semibold">
            <span>{product?.currency}</span>
            <span>{formatNumber(product?.currentPrice)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

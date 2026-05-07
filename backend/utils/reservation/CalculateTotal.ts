import { Article } from "../../src/entities/Article";

export function calculateTotal(articles: Article[]): number {
  return articles.reduce((sum, article) => {
    return sum + article.product.price;
  }, 0);
}

import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

export async function fetchLatestFacebookImages(pageUrl: string, maxPosts: number = 3) {
  try {
    // We use a popular Facebook scraping actor. 
    // Note: You must ensure you have access to this actor in your Apify account.
    // 'apify/facebook-posts-scraper' or similar. 
    // Here we use a generic placeholder name for the actor.
    const run = await client.actor("apify/facebook-posts-scraper").call({
      startUrls: [{ url: pageUrl }],
      resultsLimit: maxPosts,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    // Extract image URLs from the posts
    const imageUrls: string[] = [];
    for (const post of items as any[]) {
      if (post.images && Array.isArray(post.images)) {
        imageUrls.push(...post.images);
      } else if (post.image) {
        imageUrls.push(String(post.image));
      }
    }
    
    return imageUrls;
  } catch (error) {
    console.error("Error fetching Facebook images:", error);
    throw error;
  }
}

import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY,
});

export interface FacebookPost {
  text: string;
  images: string[];
  date: string;
}

/**
 * @deprecated Use fetchFacebookPosts instead.
 */
export async function fetchLatestFacebookImages(pageUrl: string, maxPosts: number = 3) {
  try {
    const run = await client.actor("apify/facebook-posts-scraper").call({
      startUrls: [{ url: pageUrl }],
      resultsLimit: maxPosts,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
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

export async function fetchFacebookPosts(pageUrl: string, maxPosts: number = 10): Promise<FacebookPost[]> {
  try {
    const run = await client.actor("apify/facebook-posts-scraper").call({
      startUrls: [{ url: pageUrl }],
      resultsLimit: maxPosts,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    const posts: FacebookPost[] = [];
    for (const item of items as any[]) {
      const text = item.text || item.message || item.caption || '';
      const date = item.date || item.time || item.createdAt || new Date().toISOString();
      
      const images: string[] = [];
      if (item.images && Array.isArray(item.images)) {
        images.push(...item.images);
      } else if (item.image) {
        images.push(String(item.image));
      }
      
      posts.push({ text, images, date });
    }
    
    return posts;
  } catch (error) {
    console.error("Error fetching Facebook posts:", error);
    throw error;
  }
}

export function findCurrentWeekPost(posts: FacebookPost[]): FacebookPost | null {
  const now = new Date();
  
  // Calculate the Monday and Friday of the current week
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const mondayDate = monday.getDate();
  const fridayDate = friday.getDate();

  for (const post of posts) {
    const text = post.text.toLowerCase();
    
    // Check if the post mentions "lunes" and "viernes" along with the correct dates
    // Allows optional leading zeros, e.g. "06" vs "6"
    const regex = new RegExp(`lunes\\s+0?${mondayDate}\\b.*viernes\\s+0?${fridayDate}\\b`, 'i');
    
    if (regex.test(text)) {
      return post;
    }
    
    // Fallback: simple includes check if the regex fails due to different phrasing
    if (text.includes('lunes') && text.includes('viernes') && 
        text.includes(mondayDate.toString()) && text.includes(fridayDate.toString())) {
      return post;
    }
  }
  
  return null;
}

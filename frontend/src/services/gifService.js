const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'dc6zaTOxFJmzC'; // Public beta key for testing
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

const gifService = {
  // Search for GIFs
  searchGifs: async (query, limit = 25, offset = 0) => {
    try {
      const response = await fetch(
        `${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        gifs: data.data.map(gif => ({
          id: gif.id,
          url: gif.url,
          title: gif.title,
          images: {
            original: gif.images.original.url,
            fixed_height: gif.images.fixed_height.url,
            fixed_width: gif.images.fixed_width.url,
            fixed_height_small: gif.images.fixed_height_small.url,
            fixed_width_small: gif.images.fixed_width_small.url,
            preview_gif: gif.images.preview_gif?.url,
            preview_webp: gif.images.preview_webp?.url
          }
        })),
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Error searching GIFs:', error);
      return {
        success: false,
        gifs: [],
        error: error.message
      };
    }
  },

  // Get trending GIFs
  getTrendingGifs: async (limit = 25, offset = 0) => {
    try {
      const response = await fetch(
        `${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=g`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        gifs: data.data.map(gif => ({
          id: gif.id,
          url: gif.url,
          title: gif.title,
          images: {
            original: gif.images.original.url,
            fixed_height: gif.images.fixed_height.url,
            fixed_width: gif.images.fixed_width.url,
            fixed_height_small: gif.images.fixed_height_small.url,
            fixed_width_small: gif.images.fixed_width_small.url,
            preview_gif: gif.images.preview_gif?.url,
            preview_webp: gif.images.preview_webp?.url
          }
        })),
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
      return {
        success: false,
        gifs: [],
        error: error.message
      };
    }
  },

  // Get GIF by ID
  getGifById: async (gifId) => {
    try {
      const response = await fetch(
        `${GIPHY_API_URL}/${gifId}?api_key=${GIPHY_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        gif: {
          id: data.data.id,
          url: data.data.url,
          title: data.data.title,
          images: {
            original: data.data.images.original.url,
            fixed_height: data.data.images.fixed_height.url,
            fixed_width: data.data.images.fixed_width.url,
            fixed_height_small: data.data.images.fixed_height_small.url,
            fixed_width_small: data.data.images.fixed_width_small.url,
            preview_gif: data.data.images.preview_gif?.url,
            preview_webp: data.data.images.preview_webp?.url
          }
        }
      };
    } catch (error) {
      console.error('Error fetching GIF by ID:', error);
      return {
        success: false,
        gif: null,
        error: error.message
      };
    }
  },

  // Get random GIF
  getRandomGif: async (tag = '') => {
    try {
      const url = tag
        ? `${GIPHY_API_URL}/random?api_key=${GIPHY_API_KEY}&tag=${encodeURIComponent(tag)}&rating=g`
        : `${GIPHY_API_URL}/random?api_key=${GIPHY_API_KEY}&rating=g`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        gif: {
          id: data.data.id,
          url: data.data.url,
          title: data.data.title,
          images: {
            original: data.data.images.original.url,
            fixed_height: data.data.images.fixed_height.url,
            fixed_width: data.data.images.fixed_width.url,
            fixed_height_small: data.data.images.fixed_height_small.url,
            fixed_width_small: data.data.images.fixed_width_small.url,
            preview_gif: data.data.images.preview_gif?.url,
            preview_webp: data.data.images.preview_webp?.url
          }
        }
      };
    } catch (error) {
      console.error('Error fetching random GIF:', error);
      return {
        success: false,
        gif: null,
        error: error.message
      };
    }
  }
};

export default gifService;

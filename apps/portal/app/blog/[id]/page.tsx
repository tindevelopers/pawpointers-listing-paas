'use client';

import Link from "next/link";
import Image from "next/image";
import { Header, Footer } from "@/components/layout";
import { useState } from "react";
import { useParams } from "next/navigation";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "PawPointers";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: string;
  image: string;
  date: string;
  author: string;
  authorRole: string;
  relatedServices: string[];
}

interface ServiceListing {
  id: string;
  title: string;
  image: string;
  location: string;
  price?: number;
  rating: number;
  reviewCount: number;
  category: string;
}

const blogPosts: Record<string, BlogPost> = {
  "1": {
    id: "1",
    title: "How Often Should You Groom Your Dog?",
    excerpt: "A complete guide to grooming schedules based on breed, coat type, and lifestyle.",
    category: "Grooming Tips",
    readTime: "5 min read",
    image: "https://images.pexels.com/photos/8481760/pexels-photo-8481760.jpeg?w=800&h=400&fit=crop",
    date: "2 days ago",
    author: "Sarah Mitchell",
    authorRole: "Professional Dog Groomer",
    relatedServices: ["grooming", "pet-care"],
    content: `
      <h2>Introduction</h2>
      <p>Grooming is one of the most important aspects of pet care. It not only keeps your dog looking great but also maintains their health and comfort. However, the ideal grooming schedule varies significantly based on several factors including breed, coat type, lifestyle, and individual needs.</p>

      <h2>Factors That Determine Grooming Frequency</h2>
      
      <h3>1. Coat Type</h3>
      <p>Your dog's coat type is the primary factor determining grooming needs:</p>
      <ul>
        <li><strong>Short-haired dogs:</strong> Require grooming every 4-8 weeks</li>
        <li><strong>Medium-haired dogs:</strong> Need grooming every 6-8 weeks</li>
        <li><strong>Long-haired dogs:</strong> Should be groomed every 4-6 weeks</li>
        <li><strong>Curly/wire-haired dogs:</strong> Often need grooming every 4-6 weeks</li>
      </ul>

      <h3>2. Breed-Specific Needs</h3>
      <p>Different breeds have different grooming requirements:</p>
      <ul>
        <li><strong>Poodles & Doodles:</strong> Every 4-6 weeks (high maintenance)</li>
        <li><strong>Golden Retrievers:</strong> Every 6-8 weeks</li>
        <li><strong>Bulldogs:</strong> Every 8-12 weeks</li>
        <li><strong>Shih Tzus:</strong> Every 4-6 weeks</li>
      </ul>

      <h3>3. Lifestyle and Activity Level</h3>
      <p>Dogs with active lifestyles may need more frequent grooming. A dog that spends lots of time outdoors, swimming, or playing in muddy areas will benefit from more regular bathing and grooming sessions.</p>

      <h3>4. Age and Health</h3>
      <p>Senior dogs and those with skin conditions may need specialized grooming care and more frequent bathing with medicated shampoos.</p>

      <h2>Regular Maintenance Between Grooming Appointments</h2>
      <p>Between professional grooming sessions, you should:</p>
      <ul>
        <li>Brush your dog's coat 2-3 times per week (or daily for long-haired breeds)</li>
        <li>Check and clean ears weekly</li>
        <li>Trim nails every 3-4 weeks</li>
        <li>Bathe your dog at home every 4-12 weeks depending on coat type</li>
      </ul>

      <h2>Warning Signs Your Dog Needs Grooming</h2>
      <p>Watch for these signs that grooming time is due:</p>
      <ul>
        <li>Matted or tangled fur</li>
        <li>Overgrown nails clicking on the floor</li>
        <li>Dirty or waxy ear buildup</li>
        <li>Excessive shedding</li>
        <li>Odor or oily coat</li>
      </ul>

      <h2>Finding the Right Groomer</h2>
      <p>When selecting a professional groomer, look for someone who:</p>
      <ul>
        <li>Has experience with your breed</li>
        <li>Uses positive reinforcement techniques</li>
        <li>Maintains a clean, safe facility</li>
        <li>Has excellent reviews and references</li>
        <li>Communicates openly about your dog's needs</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Regular grooming is essential for your dog's health, comfort, and happiness. By understanding your dog's specific needs and maintaining a consistent grooming schedule, you'll help them stay healthy and looking their best. Remember, every dog is unique, so consult with your veterinarian or professional groomer to determine the perfect grooming routine for your furry friend.</p>
    `,
  },
  "2": {
    id: "2",
    title: "Signs Your Pet Might Need a Vet Visit",
    excerpt: "Learn the warning signs that indicate your furry friend needs professional veterinary care.",
    category: "Pet Health",
    readTime: "6 min read",
    image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=800&h=400&fit=crop",
    date: "5 days ago",
    author: "Dr. James Chen",
    authorRole: "Veterinary Doctor",
    relatedServices: ["veterinary", "health"],
    content: `
      <h2>Introduction</h2>
      <p>As pet owners, we want to ensure our furry companions stay healthy and happy. Recognizing when your pet needs veterinary care is crucial for their wellbeing. Some signs are obvious, while others can be subtle. Let's explore the key indicators that it's time to schedule a vet visit.</p>

      <h2>Physical Symptoms to Watch For</h2>
      
      <h3>1. Changes in Eating or Drinking Habits</h3>
      <p>Significant changes in appetite or water consumption can indicate health issues:</p>
      <ul>
        <li>Refusing food for more than 24 hours</li>
        <li>Excessive drinking or not drinking enough</li>
        <li>Weight loss or gain</li>
      </ul>

      <h3>2. Digestive Issues</h3>
      <p>Pay attention to bathroom habits:</p>
      <ul>
        <li>Persistent diarrhea or constipation</li>
        <li>Vomiting more than once</li>
        <li>Straining to defecate or urinate</li>
      </ul>

      <h3>3. Skin and Coat Problems</h3>
      <ul>
        <li>Excessive scratching or hair loss</li>
        <li>Redness, rashes, or scabs</li>
        <li>Unusual odor</li>
      </ul>

      <h2>Behavioral Red Flags</h2>
      <ul>
        <li>Lethargy or unusual tiredness</li>
        <li>Aggression or unusual behavior changes</li>
        <li>Disorientation or confusion</li>
        <li>Difficulty walking or lameness</li>
      </ul>

      <h2>Emergency Situations</h2>
      <p>Seek immediate veterinary care if you notice:</p>
      <ul>
        <li>Difficulty breathing</li>
        <li>Inability to urinate or defecate</li>
        <li>Severe bleeding or trauma</li>
        <li>Collapse or loss of consciousness</li>
        <li>Severe pain or crying</li>
      </ul>

      <h2>Preventative Care Schedule</h2>
      <p>Beyond emergency signs, maintain regular vet visits:</p>
      <ul>
        <li>Puppies and kittens: Every 3-4 weeks until 16 weeks old</li>
        <li>Adults: Annual checkups</li>
        <li>Seniors (7+ years): Twice yearly</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Your pet cannot tell you when they're feeling ill, so it's important to trust your instincts. When in doubt, it's always better to have your pet checked by a veterinarian. Early detection of health issues can prevent serious complications and save lives.</p>
    `,
  },
  "3": {
    id: "3",
    title: "Choosing the Right Food for Your Pet's Age",
    excerpt: "From puppies to seniors: nutritional needs change throughout your pet's life.",
    category: "Nutrition",
    readTime: "7 min read",
    image: "https://images.pexels.com/photos/2398220/pexels-photo-2398220.jpeg?w=800&h=400&fit=crop",
    date: "1 week ago",
    author: "Emily Rodriguez",
    authorRole: "Pet Nutritionist",
    relatedServices: ["nutrition", "pet-care"],
    content: `
      <h2>Introduction</h2>
      <p>Your pet's nutritional needs change dramatically throughout their life. Just like humans, puppies, adult dogs, and senior pets require different nutrients in different amounts. Understanding these needs is essential for keeping your pet healthy and extending their lifespan.</p>

      <h2>Puppy and Kitten Nutrition (0-12 months)</h2>
      
      <h3>Why It Matters</h3>
      <p>Young pets are growing rapidly and need more calories and specific nutrients to support this growth.</p>

      <h3>Key Nutrients</h3>
      <ul>
        <li><strong>Protein:</strong> Higher levels (18-25% for dogs, 25-30% for cats)</li>
        <li><strong>Fat:</strong> For brain development and energy</li>
        <li><strong>Calcium & Phosphorus:</strong> For bone development (proper ratio is crucial)</li>
        <li><strong>DHA:</strong> For cognitive and vision development</li>
      </ul>

      <h3>Feeding Recommendations</h3>
      <ul>
        <li>Feed specialized puppy or kitten formulas</li>
        <li>3-4 meals per day for puppies under 6 months</li>
        <li>2-3 meals per day from 6-12 months</li>
      </ul>

      <h2>Adult Pet Nutrition (1-7 years)</h2>
      
      <h3>Nutritional Needs</h3>
      <p>Adult pets have different needs than growing puppies. They require a balanced diet for maintenance.</p>

      <h3>Key Nutrients</h3>
      <ul>
        <li><strong>Protein:</strong> 18% for dogs, 25% for cats (minimum)</li>
        <li><strong>Fat:</strong> 5% for dogs, 9% for cats</li>
        <li><strong>Fiber:</strong> For digestive health</li>
        <li><strong>Vitamins & Minerals:</strong> Complete and balanced formula</li>
      </ul>

      <h3>Feeding Guidelines</h3>
      <ul>
        <li>Feed once or twice daily based on activity level</li>
        <li>Adjust portions for weight management</li>
        <li>Maintain consistent feeding times</li>
      </ul>

      <h2>Senior Pet Nutrition (7+ years)</h2>
      
      <h3>Changing Needs</h3>
      <p>Senior pets have unique nutritional requirements to support aging joints, cognitive function, and declining metabolism.</p>

      <h3>Key Nutrients</h3>
      <ul>
        <li><strong>High-quality Protein:</strong> Maintain muscle mass (even more important than in adults)</li>
        <li><strong>Glucosamine & Chondroitin:</strong> For joint health</li>
        <li><strong>Antioxidants:</strong> To combat aging effects</li>
        <li><strong>Omega-3 Fatty Acids:</strong> For brain and joint health</li>
        <li><strong>Lower Fat:</strong> Many seniors are less active</li>
      </ul>

      <h3>Special Considerations</h3>
      <ul>
        <li>May need easily digestible foods</li>
        <li>Smaller, more frequent meals</li>
        <li>Monitor weight carefully</li>
        <li>Consider prescription diets for specific health conditions</li>
      </ul>

      <h2>Reading Pet Food Labels</h2>
      <p>When selecting food for your pet:</p>
      <ul>
        <li>Check the first few ingredients (meat should be primary)</li>
        <li>Verify it's complete and balanced (AAFCO statement)</li>
        <li>Look for age-appropriate formulations</li>
        <li>Consider your pet's specific health needs</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Choosing the right food at each life stage is one of the best investments in your pet's long-term health. Don't hesitate to consult your veterinarian or a pet nutritionist to create a feeding plan tailored to your pet's individual needs.</p>
    `,
  },
};

const relatedListingsByCategory: Record<string, ServiceListing[]> = {
  grooming: [
    {
      id: "1",
      title: "Premium Pet Grooming Salon",
      image: "https://images.pexels.com/photos/6816837/pexels-photo-6816837.jpeg?w=400&h=300&fit=crop",
      location: "Downtown",
      price: 75,
      rating: 4.9,
      reviewCount: 341,
      category: "Pet Grooming",
    },
    {
      id: "2",
      title: "Mobile Dog Grooming Service",
      image: "https://images.pexels.com/photos/8481759/pexels-photo-8481759.jpeg?w=400&h=300&fit=crop",
      location: "City Wide",
      price: 85,
      rating: 4.8,
      reviewCount: 215,
      category: "Pet Grooming",
    },
    {
      id: "3",
      title: "Luxury Pet Spa",
      image: "https://images.pexels.com/photos/6816841/pexels-photo-6816841.jpeg?w=400&h=300&fit=crop",
      location: "Uptown",
      price: 95,
      rating: 4.9,
      reviewCount: 428,
      category: "Pet Grooming",
    },
  ],
  veterinary: [
    {
      id: "4",
      title: "Modern Veterinary Clinic",
      image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=400&h=300&fit=crop",
      location: "Healthcare District",
      rating: 4.8,
      reviewCount: 512,
      category: "Veterinary Services",
    },
    {
      id: "5",
      title: "24/7 Emergency Animal Hospital",
      image: "https://images.pexels.com/photos/8434174/pexels-photo-8434174.jpeg?w=400&h=300&fit=crop",
      location: "Medical Center",
      rating: 4.7,
      reviewCount: 389,
      category: "Veterinary Services",
    },
    {
      id: "6",
      title: "Wellness Pet Medical Center",
      image: "https://images.pexels.com/photos/5632391/pexels-photo-5632391.jpeg?w=400&h=300&fit=crop",
      location: "Midtown",
      rating: 4.9,
      reviewCount: 276,
      category: "Veterinary Services",
    },
  ],
  nutrition: [
    {
      id: "7",
      title: "Premium Pet Nutrition Consultation",
      image: "https://images.pexels.com/photos/2398220/pexels-photo-2398220.jpeg?w=400&h=300&fit=crop",
      location: "Health & Wellness",
      rating: 4.9,
      reviewCount: 187,
      category: "Pet Nutrition",
    },
    {
      id: "8",
      title: "Natural Pet Food Specialist",
      image: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?w=400&h=300&fit=crop",
      location: "Organic District",
      rating: 4.8,
      reviewCount: 234,
      category: "Pet Nutrition",
    },
  ],
};

export default function BlogPostPage() {
  const params = useParams();
  const postId = params.id as string;
  const post = blogPosts[postId];

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-24">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Post Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              The blog post you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/blog">
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-all">
                Back to Blog
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedListings = post.relatedServices
    .flatMap((service) => relatedListingsByCategory[service] || [])
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />

      <main className="flex-1">
        {/* Hero Image */}
        <div className="relative h-96 md:h-[500px] bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Article Content */}
        <article className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Back Link */}
              <Link
                href="/blog"
                className="text-orange-500 hover:text-orange-600 font-semibold mb-6 inline-flex items-center gap-2"
              >
                ← Back to Blog
              </Link>

              {/* Header */}
              <header className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold px-4 py-1 rounded-full">
                    {post.category}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {post.date}
                  </span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  {post.title}
                </h1>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {post.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {post.author}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {post.authorRole}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {post.readTime}
                  </span>
                </div>
              </header>

              {/* Article Body */}
              <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
                <div
                  dangerouslySetInnerHTML={{ __html: post.content }}
                  className="text-gray-700 dark:text-gray-300 space-y-6"
                />
              </div>

              {/* Share Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-12">
                <p className="text-gray-900 dark:text-white font-semibold mb-4">
                  Share this article
                </p>
                <div className="flex gap-4">
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </a>
                  <a
                    href="#"
                    className="text-blue-400 hover:text-blue-500 font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9-1 9-5.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0323 3z" />
                    </svg>
                    Twitter
                  </a>
                  <a
                    href="#"
                    className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9-1 9-5.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0123 3z" />
                    </svg>
                    Pinterest
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 my-12"></div>

              {/* Related Listings Section */}
              {relatedListings.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                    🐾 Recommended Services for &quot;{post.title}&quot;
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Found a topic that interests you? Here are trusted{" "}
                    {PLATFORM_NAME} professionals who specialize in this area:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relatedListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="group rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 hover:translate-y-[-4px]"
                      >
                        {/* Image */}
                        <div className="relative h-40 overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <img
                            src={listing.image}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                            {listing.title}
                          </h3>

                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.floor(listing.rating)
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {listing.rating} ({listing.reviewCount} reviews)
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            📍 {listing.location}
                          </p>

                          {listing.price && (
                            <p className="text-lg font-bold text-orange-500 mb-4">
                              From £{listing.price}
                            </p>
                          )}

                          <Link href={`/listings/${listing.id}`}>
                            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                              View Service
                            </button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* CTA Section */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">
                  Looking for More Professional Services?
                </h3>
                <p className="mb-6 text-orange-100">
                  Browse {PLATFORM_NAME} to find the perfect service provider for your pet.
                </p>
                <Link href="/search">
                  <button className="bg-white text-orange-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-all">
                    Find Services
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

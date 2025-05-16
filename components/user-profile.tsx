"use client";

import { getUserProfile, getUserReviews, Review as ReviewType, updateUserProfile, UserProfile } from "@/actions/user-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  ExternalLink,
  GraduationCap,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Star,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { UserReviewsSection } from "./reviews/user-reviews-section";

// Define form schema
const profileFormSchema = z.object({
  bio: z.string().max(500).optional().nullable(),
  skills: z.string().max(200).optional().nullable(),
  experience: z.string().max(1000).optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Define portfolio item type
interface PortfolioItem {
  id: string;
  title: string;
  url: string;
}

interface UserProfileComponentProps {
  userId?: string;
}

export function UserProfileComponent({ userId }: UserProfileComponentProps) {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemUrl, setNewItemUrl] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // Initialize form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: "",
      skills: "",
      experience: "",
    },
  });

  // Load user profile data
  useEffect(() => {
    async function loadProfile() {
      const profileUserId = userId || user?.id;
      
      if (profileUserId) {
        try {
          setLoading(true);
          const [userData, userReviews] = await Promise.all([
            getUserProfile(profileUserId),
            getUserReviews(profileUserId)
          ]);
          
          if (userData) {
            // Check if viewing own profile
            setIsCurrentUser(!!user && user.id === profileUserId);
            
            // If no rating exists, calculate one from the dummy reviews
            if (userData.rating === null || userData.rating === undefined) {
              // Calculate average rating from reviews
              const averageRating = userReviews.length > 0
                ? userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length
                : 4.2; // Default rating if no reviews
              
              userData.rating = parseFloat(averageRating.toFixed(1));
            }
            
            setProfile(userData);
            
            // Parse skills into array for display
            const skillsString = userData.skills ? 
              (JSON.parse(userData.skills).skills || "") : "";
            setSkills(skillsString.split(',').map(skill => skill.trim()).filter(Boolean));
            
            form.reset({
              bio: userData.bio || "",
              skills: skillsString,
              experience: userData.experience || "",
            });
            setPortfolioItems(userData.portfolio || []);
          }
          
          setReviews(userReviews);
        } catch (error) {
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile data");
        } finally {
          setLoading(false);
        }
      }
    }

    if ((isLoaded && user) || userId) {
      loadProfile();
    }
  }, [user, isLoaded, userId, form]);

  // Function to add a portfolio item
  const addPortfolioItem = () => {
    if (!newItemTitle || !newItemUrl) {
      toast.error("Please provide both title and URL");
      return;
    }

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      title: newItemTitle,
      url: newItemUrl,
    };

    setPortfolioItems([...portfolioItems, newItem]);
    setNewItemTitle("");
    setNewItemUrl("");
    setAddingItem(false);
    toast.success("Portfolio item added");
  };

  // Function to remove a portfolio item
  const removePortfolioItem = (id: string) => {
    setPortfolioItems(portfolioItems.filter(item => item.id !== id));
    toast.success("Portfolio item removed");
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user?.id) return;

    try {
      setSaving(true);
      const updatedProfile = await updateUserProfile(user.id, {
        bio: data.bio,
        skills: data.skills,
        portfolio: portfolioItems,
        experience: data.experience,
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
        
        // Update skills display
        if (data.skills) {
          setSkills(data.skills.split(',').map(skill => skill.trim()).filter(Boolean));
        } else {
          setSkills([]);
        }
        
        setIsEditing(false);
        toast.success("Profile updated successfully");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating your profile");
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="h-4 w-4 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-10 w-10 rounded-md bg-gray-200"></div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-[1fr_3fr] gap-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-32 w-32 rounded-full bg-gray-200"></div>
              <div className="h-6 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-40"></div>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-40"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If in editing mode, show the form (only for current user's profile)
  if (isEditing && isCurrentUser) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">Edit Profile</CardTitle>
              <CardDescription>Update your professional information</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write a short bio about yourself..."
                            className="min-h-[120px]"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Share a bit about yourself, your background, and what you do.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Web Development, Content Writing, Design..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          List your key skills separated by commas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Portfolio Links</FormLabel>
                    <FormDescription className="mb-3">
                      Add links to your work or projects
                    </FormDescription>
                    
                    <div className="space-y-2 mb-4">
                      {portfolioItems.length > 0 ? (
                        portfolioItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              <span className="font-medium">{item.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline"
                              >
                                View
                              </a>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removePortfolioItem(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">No portfolio links added yet.</p>
                      )}
                    </div>

                    {addingItem ? (
                      <div className="border rounded-md p-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <FormLabel htmlFor="itemTitle">Title</FormLabel>
                            <Input 
                              id="itemTitle" 
                              value={newItemTitle} 
                              onChange={(e) => setNewItemTitle(e.target.value)} 
                              placeholder="e.g. My Portfolio Website"
                            />
                          </div>
                          
                          <div>
                            <FormLabel htmlFor="itemUrl">URL</FormLabel>
                            <Input 
                              id="itemUrl" 
                              value={newItemUrl} 
                              onChange={(e) => setNewItemUrl(e.target.value)} 
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setAddingItem(false)}>
                            Cancel
                          </Button>
                          <Button type="button" onClick={addPortfolioItem}>
                            Add Link
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => setAddingItem(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Add Portfolio Link
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your work experience, education, and achievements..."
                            className="min-h-[150px]"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Share your professional experience and educational background
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Profile"}
                      {!saving && <Save className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View mode - LinkedIn-like UI
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-400 to-blue-600"></div>
        <CardContent className="relative pt-0">
          <div className="absolute -top-16 left-4 border-4 border-white rounded-full bg-white dark:border-gray-800">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profile?.image || user?.imageUrl} alt={profile?.name || user?.fullName || "User"} />
              <AvatarFallback className="text-3xl">{profile?.name?.charAt(0) || user?.fullName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="ml-36 mt-3 mb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{profile?.name || user?.fullName}</h2>
                {profile?.rating !== null && profile?.rating !== undefined && (
                  <div className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                    <div className="flex mr-1">
                      {renderStars(profile.rating)}
                    </div>
                    <span className="font-semibold">{profile.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">{profile?.email || user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
            {isCurrentUser && (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            )}
          </div>
          
          {profile?.bio && (
            <>
              <Separator className="my-4" />
              <div className="prose dark:prose-invert max-w-none">
                <p>{profile.bio}</p>
              </div>
            </>
          )}
          
          {skills.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="font-semibold mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Portfolio Section */}
      {portfolioItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" /> Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <h3 className="font-medium">{item.title}</h3>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-end">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> View
                    </a>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Experience Section */}
      {profile?.experience && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" /> Experience & Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <p style={{ whiteSpace: 'pre-line' }}>{profile.experience}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" /> Reviews
            {reviews.length > 0 && <Badge className="ml-2" variant="secondary">{reviews.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={review.reviewer.image || undefined} alt={review.reviewer.name || "Reviewer"} />
                        <AvatarFallback>
                          {review.reviewer.name ? review.reviewer.name.charAt(0) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{review.reviewer.name || "Anonymous"}</p>
                        <div className="flex items-center">
                          <div className="flex mr-2">{renderStars(review.rating)}</div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No reviews yet</p>
              <p className="text-sm mt-1">Reviews will appear here when others review this user</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserIcon className="h-5 w-5 mr-2" /> Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-3">
            <Mail className="h-5 w-5 mr-3 text-gray-500" />
            <span>{profile?.email || user?.emailAddresses?.[0]?.emailAddress}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Profile information is visible to other users on the platform
          </p>
        </CardContent>
      </Card>
      
      {/* Reviews Section */}
      {profile && <UserReviewsSection userId={profile.id} />}
    </div>
  );
} 
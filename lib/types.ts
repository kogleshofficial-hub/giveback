export type ListingStatus = "active" | "reserved" | "completed" | "expired" | "removed";
export type ListingCategory = "Books" | "School" | "Clothing" | "Home" | "Electronics" | "Sports" | "Toys & Games" | "Other";
export type ListingCondition = "new" | "like_new" | "good" | "fair";
export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";
export type Listing = {
 id:string; owner_id:string; title:string; description:string; category:string; condition:ListingCondition; city:string; state:string|null; country:string; pickup_notes:string|null; status:ListingStatus; created_at:string; updated_at:string; expires_at:string|null;
 image_url?:string|null;
};

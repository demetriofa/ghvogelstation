export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      birds: {
        Row: {
          id: number
          scientific_name: string
          common_name_ger: string | null
          common_name_eng: string | null
          common_name_spa: string | null
          image_url: string | null
          wikipedia_url: string | null
          description: string | null
        }
        Insert: {
          id?: number
          scientific_name: string
          common_name_ger?: string | null
          common_name_eng?: string | null
          common_name_spa?: string | null
          image_url?: string | null
          wikipedia_url?: string | null
          description?: string | null
        }
        Update: {
          id?: number
          scientific_name?: string
          common_name_ger?: string | null
          common_name_eng?: string | null
          common_name_spa?: string | null
          image_url?: string | null
          wikipedia_url?: string | null
          description?: string | null
        }
      }
      locations: {
        Row: {
          id: number
          name: string | null
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id?: number
          name?: string | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: number
          name?: string | null
          latitude?: number | null
          longitude?: number | null
        }
      }
      detections: {
        Row: {
          id: number
          created_at: string
          bird_id: number | null
          location_id: number | null
          date: string
          time: string
          confidence: number | null
          week: number | null
          threshold: number | null
          sensitivity: number | null
          overlap: number | null
          audio_url: string | null
          histogram_url: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          bird_id?: number | null
          location_id?: number | null
          date: string
          time: string
          confidence?: number | null
          week?: number | null
          threshold?: number | null
          sensitivity?: number | null
          overlap?: number | null
          audio_url?: string | null
          histogram_url?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          bird_id?: number | null
          location_id?: number | null
          date?: string
          time?: string
          confidence?: number | null
          week?: number | null
          threshold?: number | null
          sensitivity?: number | null
          overlap?: number | null
          audio_url?: string | null
          histogram_url?: string | null
        }
      }
    }
  }
}

// Convenience types
export type Bird = Database['public']['Tables']['birds']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type Detection = Database['public']['Tables']['detections']['Row']

export type DetectionWithBird = Detection & {
  birds: Bird | null
  locations: Location | null
}

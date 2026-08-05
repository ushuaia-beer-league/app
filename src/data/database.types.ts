export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      admins: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          email: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email: string
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          key: string
          name: string
          rulebook: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          key: string
          name: string
          rulebook?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          key?: string
          name?: string
          rulebook?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goalie_lines: {
        Row: {
          created_at: string
          goals_against: number
          match_id: string
          player_id: string
          shots_faced: number
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goals_against: number
          match_id: string
          player_id: string
          shots_faced: number
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goals_against?: number
          match_id?: string
          player_id?: string
          shots_faced?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'goalie_lines_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'goalie_lines_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'goalie_lines_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      match_goals: {
        Row: {
          assist_id: string | null
          created_at: string
          id: string
          match_id: string
          scorer_id: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          assist_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          scorer_id?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          assist_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          scorer_id?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'match_goals_assist_id_fkey'
            columns: ['assist_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_goals_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_goals_scorer_id_fkey'
            columns: ['scorer_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_goals_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          is_franchise: boolean
          is_substitute: boolean
          match_id: string
          player_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_franchise?: boolean
          is_substitute?: boolean
          match_id: string
          player_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_franchise?: boolean
          is_substitute?: boolean
          match_id?: string
          player_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'match_players_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_players_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_players_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      matches: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          competition_key: string
          created_at: string
          franchise_substitute: boolean
          home_goals: number | null
          home_team_id: string | null
          id: string
          match_date: string
          notes: string | null
          resolution: string | null
          season_id: string
          stage: string
          start_time: string
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          competition_key: string
          created_at?: string
          franchise_substitute?: boolean
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          match_date: string
          notes?: string | null
          resolution?: string | null
          season_id: string
          stage?: string
          start_time: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          competition_key?: string
          created_at?: string
          franchise_substitute?: boolean
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          match_date?: string
          notes?: string | null
          resolution?: string | null
          season_id?: string
          stage?: string
          start_time?: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_away_team_fkey'
            columns: ['away_team_id', 'competition_key']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id', 'competition_key']
          },
          {
            foreignKeyName: 'matches_competition_key_fkey'
            columns: ['competition_key']
            isOneToOne: false
            referencedRelation: 'competitions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'matches_home_team_fkey'
            columns: ['home_team_id', 'competition_key']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id', 'competition_key']
          },
          {
            foreignKeyName: 'matches_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      page_views: {
        Row: {
          day: string
          path: string
          updated_at: string
          views: number
        }
        Insert: {
          day?: string
          path: string
          updated_at?: string
          views?: number
        }
        Update: {
          day?: string
          path?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          competition_key: string | null
          created_at: string
          display_order: number
          id: string
          season_id: string
          storage_path: string
          taken_on: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          competition_key?: string | null
          created_at?: string
          display_order?: number
          id?: string
          season_id: string
          storage_path: string
          taken_on?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          competition_key?: string | null
          created_at?: string
          display_order?: number
          id?: string
          season_id?: string
          storage_path?: string
          taken_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photos_competition_key_fkey'
            columns: ['competition_key']
            isOneToOne: false
            referencedRelation: 'competitions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'photos_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          created_at: string
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          last_name: string | null
          level: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          first_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          level?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          level?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      published_goalie_stats: {
        Row: {
          competition_key: string
          created_at: string
          games_played: number
          goals_against: number
          id: string
          player_id: string | null
          printed_player_name: string
          printed_team: string | null
          published_on: string
          season_id: string
          shots_faced: number
          source_file: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          competition_key: string
          created_at?: string
          games_played: number
          goals_against: number
          id?: string
          player_id?: string | null
          printed_player_name: string
          printed_team?: string | null
          published_on: string
          season_id: string
          shots_faced: number
          source_file: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          competition_key?: string
          created_at?: string
          games_played?: number
          goals_against?: number
          id?: string
          player_id?: string | null
          printed_player_name?: string
          printed_team?: string | null
          published_on?: string
          season_id?: string
          shots_faced?: number
          source_file?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'published_goalie_stats_competition_key_fkey'
            columns: ['competition_key']
            isOneToOne: false
            referencedRelation: 'competitions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'published_goalie_stats_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'published_goalie_stats_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'published_goalie_stats_team_fkey'
            columns: ['team_id', 'competition_key']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id', 'competition_key']
          },
        ]
      }
      published_player_stats: {
        Row: {
          assists: number
          competition_key: string
          created_at: string
          goals: number
          id: string
          player_id: string | null
          points: number
          printed_player_name: string
          printed_team: string | null
          published_on: string
          season_id: string
          source_file: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assists: number
          competition_key: string
          created_at?: string
          goals: number
          id?: string
          player_id?: string | null
          points: number
          printed_player_name: string
          printed_team?: string | null
          published_on: string
          season_id: string
          source_file: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assists?: number
          competition_key?: string
          created_at?: string
          goals?: number
          id?: string
          player_id?: string | null
          points?: number
          printed_player_name?: string
          printed_team?: string | null
          published_on?: string
          season_id?: string
          source_file?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'published_player_stats_competition_key_fkey'
            columns: ['competition_key']
            isOneToOne: false
            referencedRelation: 'competitions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'published_player_stats_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'published_player_stats_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'published_player_stats_team_fkey'
            columns: ['team_id', 'competition_key']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id', 'competition_key']
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          starts_on: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          starts_on?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          starts_on?: string | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          logo_path: string | null
          name: string
          season_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_path?: string | null
          name: string
          season_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_path?: string | null
          name?: string
          season_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sponsors_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      team_players: {
        Row: {
          active: boolean
          competition_key: string
          created_at: string
          id: string
          jersey_number: number | null
          player_id: string
          season_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          competition_key: string
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_id: string
          season_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          competition_key?: string
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_id?: string
          season_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_players_competition_key_fkey'
            columns: ['competition_key']
            isOneToOne: false
            referencedRelation: 'competitions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'team_players_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_players_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_players_team_fkey'
            columns: ['team_id', 'competition_key']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id', 'competition_key']
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          colour: string | null
          competition_key: string
          created_at: string
          full_name: string | null
          id: string
          logo_url: string | null
          nickname: string | null
          short_name: string
          slug: string
          sponsor: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          colour?: string | null
          competition_key: string
          created_at?: string
          full_name?: string | null
          id?: string
          logo_url?: string | null
          nickname?: string | null
          short_name: string
          slug: string
          sponsor?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          colour?: string | null
          competition_key?: string
          created_at?: string
          full_name?: string | null
          id?: string
          logo_url?: string | null
          nickname?: string | null
          short_name?: string
          slug?: string
          sponsor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_competition_key_fkey'
            columns: ['competition_key']
            isOneToOne: false
            referencedRelation: 'competitions'
            referencedColumns: ['key']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_admin_role: { Args: never; Returns: string }
      record_view: { Args: { page: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

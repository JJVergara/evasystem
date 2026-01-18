import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Instagram, Image, Tag, RefreshCw, ExternalLink } from 'lucide-react';
import { useInstagramSync } from '@/hooks/useInstagramSync';
import { toast } from 'sonner';

interface InstagramProfile {
  user_id: string;
  username: string;
  name: string;
  account_type: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

interface InstagramMedia {
  id: string;
  caption: string;
  comments_count: number;
  like_count: number;
  media_type: string;
  media_url: string;
  permalink: string;
  username: string;
}

interface InstagramTag {
  id: string;
  caption: string;
  comments_count: number;
  like_count: number;
  media_type: string;
  media_url: string;
  permalink: string;
  username: string;
}

export function InstagramBusinessDashboard() {
  const { isSyncing, getInstagramProfile, getInstagramMedia, getInstagramTags } =
    useInstagramSync();
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [tags, setTags] = useState<InstagramTag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      const profileData = await getInstagramProfile();
      if (profileData?.success && profileData.profile) {
        setProfile(profileData.profile);
      }

      const mediaData = await getInstagramMedia();
      if (mediaData?.success && mediaData.media) {
        setMedia(mediaData.media);
      }

      const tagsData = await getInstagramTags();
      if (tagsData?.success && tagsData.tags) {
        setTags(tagsData.tags);
      }
    } catch {
      toast.error('Error al cargar datos de Instagram');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Cargando datos de Instagram...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {profile && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={profile.profile_picture_url}
                  alt={profile.username}
                  className="w-16 h-16 shrink-0 rounded-full"
                />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Instagram className="w-5 h-5" />@{profile.username}
                  </CardTitle>
                  <CardDescription>{profile.name}</CardDescription>
                  <Badge variant="outline" className="mt-1">
                    {profile.account_type}
                  </Badge>
                </div>
              </div>
              <Button onClick={handleRefresh} disabled={isSyncing} size="sm" variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.followers_count.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.follows_count.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Siguiendo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.media_count.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Publicaciones</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="media" className="space-y-4">
        <TabsList>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Feed ({media.length})
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Menciones ({tags.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-square bg-muted">
                  {item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM' ? (
                    <img
                      src={item.media_url}
                      alt={item.caption?.substring(0, 50) || 'Instagram post'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.caption || 'Sin descripción'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>❤️ {item.like_count}</span>
                      <span>💬 {item.comments_count}</span>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {media.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay publicaciones disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tags">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-square bg-muted">
                  {item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM' ? (
                    <img
                      src={item.media_url}
                      alt={item.caption?.substring(0, 50) || 'Instagram mention'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">@{item.username}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.caption || 'Sin descripción'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>❤️ {item.like_count}</span>
                      <span>💬 {item.comments_count}</span>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {tags.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay menciones disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

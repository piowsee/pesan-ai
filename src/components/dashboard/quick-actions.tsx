import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Layers, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <Card className="col-span-full mb-8">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Navigate to frequently used features</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/dashboard/chat">
            <MessageSquare data-icon="inline-start" />
            Go to Chat
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/waba">
            <Layers data-icon="inline-start" />
            WABA Management
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings">
            <Settings data-icon="inline-start" />
            View Settings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

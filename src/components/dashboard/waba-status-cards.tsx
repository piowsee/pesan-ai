'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWabas } from '@/hooks/use-wabas';
import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react';

export function WabaStatusCards() {
  const { data, isLoading, isError } = useWabas(1, 100);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mb-8 p-4 text-sm text-destructive bg-destructive/10 rounded-md">
        Failed to load WABA overview statistics.
      </div>
    );
  }

  const wabas = data?.wabas || [];
  const totalWabas = data.total || 0;
  const activeWabas = wabas.filter(
    (w) => w.status.toLowerCase() === 'active',
  ).length;
  // Fallback to Suspended calculation if applicable. The status might be title case.
  const suspendedWabas = wabas.filter(
    (w) => w.status.toLowerCase() === 'suspended',
  ).length;

  const cards = [
    {
      title: 'Total WABAs',
      value: totalWabas,
      icon: Layers,
      description: 'Connected accounts',
    },
    {
      title: 'Active WABAs',
      value: activeWabas,
      icon: CheckCircle2,
      description: 'Healthy and running',
    },
    {
      title: 'Suspended WABAs',
      value: suspendedWabas,
      icon: AlertTriangle,
      description: 'Require attention',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

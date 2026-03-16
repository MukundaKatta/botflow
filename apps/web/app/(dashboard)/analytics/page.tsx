"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Users,
  TrendingUp,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface StatCard {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("7d");
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyMessages, setDailyMessages] = useState<
    { date: string; inbound: number; outbound: number }[]
  >([]);
  const supabase = createClient();

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    setLoading(true);
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Load message count
    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    // Load conversation count
    const { count: convoCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    // Load contact count
    const { count: contactCount } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    // Load active bot count
    const { count: botCount } = await supabase
      .from("bots")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    setStats([
      {
        title: "Total Messages",
        value: (messageCount || 0).toLocaleString(),
        change: 12.5,
        icon: MessageSquare,
      },
      {
        title: "Conversations",
        value: (convoCount || 0).toLocaleString(),
        change: 8.2,
        icon: TrendingUp,
      },
      {
        title: "New Contacts",
        value: (contactCount || 0).toLocaleString(),
        change: -2.1,
        icon: Users,
      },
      {
        title: "Active Bots",
        value: (botCount || 0).toString(),
        change: 0,
        icon: Bot,
      },
    ]);

    // Generate daily message data
    const daily: { date: string; inbound: number; outbound: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daily.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        inbound: Math.floor(Math.random() * 50) + 10,
        outbound: Math.floor(Math.random() * 60) + 15,
      });
    }
    setDailyMessages(daily);

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your bot performance and messaging metrics
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs">
                {stat.change > 0 ? (
                  <>
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{stat.change}%</span>
                  </>
                ) : stat.change < 0 ? (
                  <>
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                    <span className="text-red-600">{stat.change}%</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No change</span>
                )}
                <span className="ml-1 text-muted-foreground">
                  vs previous period
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {/* Simple bar chart visualization */}
            <div className="flex h-full items-end gap-1">
              {dailyMessages.map((day, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col gap-0.5">
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{
                        height: `${Math.max(4, (day.outbound / 80) * 200)}px`,
                      }}
                    />
                    <div
                      className="w-full rounded-t bg-primary/30"
                      style={{
                        height: `${Math.max(4, (day.inbound / 80) * 200)}px`,
                      }}
                    />
                  </div>
                  {i % Math.ceil(dailyMessages.length / 7) === 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {day.date}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary/80" />
                <span className="text-muted-foreground">Outbound</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary/30" />
                <span className="text-muted-foreground">Inbound</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Bots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Customer Support", messages: 1234, rate: "94%" },
                { name: "Order Bot", messages: 856, rate: "89%" },
                { name: "Lead Qualifier", messages: 432, rate: "78%" },
              ].map((bot) => (
                <div key={bot.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{bot.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bot.messages} messages
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      {bot.rate}
                    </p>
                    <p className="text-xs text-muted-foreground">Resolution rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { channel: "WhatsApp", percentage: 62, color: "bg-green-500" },
                { channel: "SMS", percentage: 25, color: "bg-blue-500" },
                { channel: "Instagram DM", percentage: 13, color: "bg-pink-500" },
              ].map((ch) => (
                <div key={ch.channel} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{ch.channel}</span>
                    <span className="font-medium">{ch.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${ch.color}`}
                      style={{ width: `${ch.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

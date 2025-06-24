import Link from "next/link";
import { ArrowUpRight, FileText, PlusCircle, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stats = [
  {
    title: "Total Bills",
    amount: "2,453",
    change: "+20 from last month",
    icon: <FileText className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: "Bills Paid",
    amount: "+2350",
    change: "+180.1% from last month",
    icon: <FileText className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: "Bills Due",
    amount: "12",
    change: "+19% from last month",
    icon: <FileText className="h-5 w-5 text-muted-foreground text-destructive" />,
  },
  {
    title: "Total Users",
    amount: "+573",
    change: "+201 since last month",
    icon: <Users className="h-5 w-5 text-muted-foreground" />,
  },
];

const recentBills = [
  {
    invoice: "INV001",
    client: { name: "Liam Johnson", email: "liam@example.com", avatar: "https://i.pravatar.cc/150?u=liam" },
    amount: "Rs. 250.00",
    status: "Paid",
  },
  {
    invoice: "INV002",
    client: { name: "Olivia Smith", email: "olivia@example.com", avatar: "https://i.pravatar.cc/150?u=olivia" },
    amount: "Rs. 150.00",
    status: "Pending",
  },
  {
    invoice: "INV003",
    client: { name: "Noah Williams", email: "noah@example.com", avatar: "https://i.pravatar.cc/150?u=noah" },
    amount: "Rs. 350.00",
    status: "Paid",
  },
  {
    invoice: "INV004",
    client: { name: "Emma Brown", email: "emma@example.com", avatar: "https://i.pravatar.cc/150?u=emma" },
    amount: "Rs. 450.00",
    status: "Overdue",
  },
  {
    invoice: "INV005",
    client: { name: "Ava Jones", email: "ava@example.com", avatar: "https://i.pravatar.cc/150?u=ava" },
    amount: "Rs. 550.00",
    status: "Paid",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Here's a quick overview of your business.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/bills/create">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Bill
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.amount}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
          <CardDescription>
            A list of your most recent bills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBills.map((bill) => (
                <TableRow key={bill.invoice}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={bill.client.avatar} alt="Avatar" />
                        <AvatarFallback>{bill.client.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-0.5">
                        <p className="font-medium">{bill.client.name}</p>
                        <p className="text-xs text-muted-foreground">{bill.client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        bill.status === "Paid"
                          ? "default"
                          : bill.status === "Pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={bill.status === "Paid" ? 'bg-green-500/20 text-green-700 border-green-500/20' : bill.status === "Pending" ? 'bg-amber-500/20 text-amber-700 border-amber-500/20' : 'bg-red-500/20 text-red-700 border-red-500/20'}
                    >
                      {bill.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{bill.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

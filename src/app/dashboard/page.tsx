import Link from "next/link";
import { CircleDollarSign, Download, Eye, FileText, PlusCircle } from "lucide-react";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const stats = [
  {
    title: "Total Revenue",
    amount: "Rs. 4,20,500",
    change: "+15.2% from last month",
    icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: "Total Bills",
    amount: "2,453",
    change: "+20 from last month",
    icon: <FileText className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: "Bills Paid",
    amount: "2,350",
    change: "+180 from last month",
    icon: <FileText className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: "Bills Due",
    amount: "12",
    change: "+2 from last month",
    icon: <FileText className="h-5 w-5 text-muted-foreground text-destructive" />,
  },
];

const recentBills = [
  {
    invoice: "INV005",
    client: { name: "Ava Jones", phone: "987-654-3210" },
    amount: "Rs. 550.00",
    status: "Paid",
    date: "2023-10-29",
  },
  {
    invoice: "INV004",
    client: { name: "Emma Brown", phone: "987-654-3211" },
    amount: "Rs. 450.00",
    status: "Overdue",
    date: "2023-10-28",
  },
  {
    invoice: "INV003",
    client: { name: "Noah Williams", phone: "987-654-3212" },
    amount: "Rs. 350.00",
    status: "Paid",
    date: "2023-10-27",
  },
  {
    invoice: "INV002",
    client: { name: "Olivia Smith", phone: "987-654-3213" },
    amount: "Rs. 150.00",
    status: "Pending",
    date: "2023-10-26",
  },
  {
    invoice: "INV001",
    client: { name: "Liam Johnson", phone: "987-654-3214" },
    amount: "Rs. 250.00",
    status: "Paid",
    date: "2023-10-25",
  },
];

export default function DashboardPage() {
  return (
    <TooltipProvider>
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
              Your 5 most recent bills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SN. NO.</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Client Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBills.map((bill, index) => (
                  <TableRow key={bill.invoice}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{bill.client.name}</div>
                    </TableCell>
                    <TableCell>{bill.client.phone}</TableCell>
                    <TableCell>{bill.date}</TableCell>
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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href="#">
                                <Download className="h-4 w-4 text-primary" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download Bill</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href="#">
                                <Eye className="h-4 w-4 text-primary" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Bill</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

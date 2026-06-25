"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import {
	FileText,
	CheckCircle,
	Clock,
	TrendingUp,
	AlertTriangle,
	Plus,
	Users,
	BarChart3,
	ArrowRight,
	Send,
	Check,
	Activity,
	FileSpreadsheet,
	RefreshCw,
	X,
	Building2,
	Calendar,
	DollarSign,
	Eye,
} from "lucide-react";
import {
	ComposedChart,
	BarChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/helpers";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";

interface DashboardClientProps {
	initialData: any;
	businessId: string;
	businessesList: any[];
}

export default function DashboardClient({
	initialData,
	businessId,
	businessesList,
}: DashboardClientProps) {
	const router = useRouter();
	const [data, setData] = useState(initialData);
	const [isRefetching, setIsRefetching] = useState(false);
	const [isReminderOpen, setIsReminderOpen] = useState(false);
	const [remindersSending, setRemindersSending] = useState(false);
	const [selectedOverdueIds, setSelectedOverdueIds] = useState<string[]>([]);
	const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

	// Get active business name or consolidated label
	const activeBusiness = businessesList.find((b) => b.id === businessId);
	const businessName =
		businessId === "all"
			? "All Businesses"
			: activeBusiness?.name || "Selected Business";

	// Overdue Invoices computed from invoices where status is overdue or sent/partial past due date
	const today = new Date();
	const overdueInvoices = (data.topOutstanding || []).filter(
		(inv: any) =>
			inv.status === "OVERDUE" ||
			((inv.status === "SENT" || inv.status === "PARTIAL") &&
				new Date(inv.dueDate) < today)
	);

	const refetchMetrics = async () => {
		setIsRefetching(true);
		try {
			const res = await fetch(`/api/dashboard?businessId=${businessId}`);
			if (res.ok) {
				const json = await res.json();
				setData(json);
			}
		} catch (err) {
			console.error("Failed to refetch dashboard metrics:", err);
		} finally {
			setIsRefetching(false);
		}
	};

	const handleMarkPaid = async (
		id: string,
		invoiceNumber: string,
		amount: number
	) => {
		setActionLoadingId(id);
		try {
			const res = await fetch(`/api/invoices/${id}/status`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					status: "PAID",
					amountPaid: amount,
					paidAt: new Date().toISOString(),
					paymentNotes: "Marked paid from dashboard command center",
				}),
			});

			if (!res.ok) {
				throw new Error("Failed to update status");
			}

			toast.success(`Invoice ${invoiceNumber} marked as PAID`);
			await refetchMetrics();
			router.refresh();
		} catch (err: any) {
			toast.error(err.message || "Failed to mark invoice as paid");
		} finally {
			setActionLoadingId(null);
		}
	};

	const handleSendSingleReminder = async (
		id: string,
		invoiceNumber: string,
		clientName: string,
		clientEmail: string
	) => {
		if (!clientEmail) {
			toast.error(`Client ${clientName} has no email address configured.`);
			return;
		}

		setActionLoadingId(id);
		try {
			const res = await fetch(`/api/invoices/${id}/email`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					to: clientEmail,
					subject: `Payment Reminder: Invoice ${invoiceNumber} from ${businessName}`,
					message: `<p>Hello ${clientName},</p><p>This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> is overdue.</p><p>Please settle the payment as soon as possible.</p>`,
					isReminder: true,
				}),
			});

			if (!res.ok) {
				throw new Error("Failed to send reminder");
			}

			toast.success(
				`Reminder sent to ${clientEmail} for invoice ${invoiceNumber}`
			);
			await refetchMetrics();
		} catch (err: any) {
			toast.error(err.message || "Failed to send payment reminder");
		} finally {
			setActionLoadingId(null);
		}
	};

	const openReminderDialog = () => {
		// Select all overdue invoices that have client emails or phone numbers by default
		const deliverableIds = overdueInvoices
			.filter((inv: any) => inv.client?.email || inv.client?.phone)
			.map((inv: any) => inv.id);
		setSelectedOverdueIds(deliverableIds);
		setIsReminderOpen(true);
	};

	const toggleSelectOverdue = (id: string) => {
		setSelectedOverdueIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);
	};

	const sendBatchReminders = async () => {
		if (selectedOverdueIds.length === 0) return;
		setRemindersSending(true);
		let successCount = 0;
		let failCount = 0;

		for (const id of selectedOverdueIds) {
			const inv = overdueInvoices.find((x: any) => x.id === id);
			if (!inv) continue;

			let sentAtLeastOne = false;

			if (inv.client?.email) {
				try {
					const res = await fetch(`/api/invoices/${id}/email`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							to: inv.client.email,
							subject: `Urgent Reminder: Invoice ${inv.invoiceNumber} is Overdue`,
							message: `<p>Hello ${inv.client.name},</p><p>We hope this email finds you well.</p><p>This is a payment reminder for invoice <strong>${inv.invoiceNumber}</strong> which is currently past due. Please settle the pending amount at your earliest convenience.</p><p>Thank you for your cooperation.</p>`,
							isReminder: true,
						}),
					});
					if (res.ok) sentAtLeastOne = true;
				} catch (err) {
					console.error("Batch email send error:", err);
				}
			}

			if (inv.client?.phone) {
				try {
					const res = await fetch(`/api/invoices/${id}/whatsapp`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							isReminder: true,
						}),
					});
					if (res.ok) sentAtLeastOne = true;
				} catch (err) {
					console.error("Batch whatsapp send error:", err);
				}
			}

			if (sentAtLeastOne) {
				successCount++;
			} else {
				failCount++;
			}
		}

		setRemindersSending(false);
		setIsReminderOpen(false);
		toast.success(
			`Batch reminders complete: ${successCount} sent successfully.${
				failCount > 0 ? ` ${failCount} failed.` : ""
			}`
		);
		await refetchMetrics();
	};

	// Compute Benchmark for Average Days to Pay
	const adp = data.avgPaymentDays || 0;
	let adpBenchmark = { label: "Excellent", color: "green" };
	if (adp > 30) adpBenchmark = { label: "Critical", color: "red" };
	else if (adp > 15) adpBenchmark = { label: "Slow", color: "orange" };
	else if (adp > 7) adpBenchmark = { label: "Good", color: "amber" };

	// Entry animations
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.35, ease: "easeOut" as const },
		},
	};

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6 max-w-7xl mx-auto pb-10 text-left"
		>
			{/* ── Page Header ── */}
			<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
				<div>
					<h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
						<span>Dashboard</span>
						{isRefetching && (
							<RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
						)}
					</h1>
					<p className="text-xs text-slate-500">
						Real-time payment collections intelligence and aging metrics for{" "}
						{businessName}.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Link href="/invoices/new">
						<Button className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm">
							<Plus className="w-4 h-4 mr-1.5" />
							<span>Create Invoice</span>
						</Button>
					</Link>
				</div>
			</div>

			{/* ── Overdue Reminders Alert Banner ── */}
			{data.overdueCount > 0 && (
				<motion.div variants={itemVariants} className="w-full">
					<Card className="bg-amber-500/10 border border-amber-500/20 dark:border-amber-900/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
								<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-[pulse_1s_infinite]" />
							</div>
							<div className="text-left">
								<p className="text-sm font-bold text-slate-900 dark:text-slate-200">
									Attention Required: {data.overdueCount} Overdue Invoices
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									You have a total outstanding overdue balance of{" "}
									<span className="font-bold text-red-600 dark:text-red-400">
										{formatCurrency(data.outstandingAmount, "INR")}
									</span>
									. Follow up to accelerate payments.
								</p>
							</div>
						</div>

						<Button
							onClick={openReminderDialog}
							className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer rounded-lg shrink-0"
						>
							<Send className="w-3.5 h-3.5 mr-1.5" />
							<span>Send Batch Reminders</span>
						</Button>
					</Card>
				</motion.div>
			)}

			{/* ── Section 2: Stats Grid Row (4 Cards) ── */}
			<motion.div
				variants={itemVariants}
				className="grid grid-cols-2 lg:grid-cols-4 gap-4"
			>
				<StatCard
					title="Billed This Month"
					value={data.thisMonthBilled}
					change={data.billedChange}
					trend={data.billedChange >= 0 ? "up" : "down"}
					formatOptions={{ style: "currency", currency: "INR" }}
					icon={<FileText className="w-5 h-5" />}
					type="billed"
					subtitle={`${data.invoiceCount || 0} invoices issued`}
				/>

				<StatCard
					title="Collected This Month"
					value={data.thisMonthCollected}
					change={data.collectedChange}
					trend={data.collectedChange >= 0 ? "up" : "down"}
					formatOptions={{ style: "currency", currency: "INR" }}
					icon={<CheckCircle className="w-5 h-5" />}
					type="collected"
					subtitle={`${data.collectionRate || 0}% all-time collections`}
				/>

				<StatCard
					title="Outstanding Balance"
					value={data.outstandingAmount}
					formatOptions={{ style: "currency", currency: "INR" }}
					icon={<Clock className="w-5 h-5" />}
					pulse={data.overdueCount > 0}
					type="outstanding"
					subtitle={`${data.overdueCount || 0} overdue accounts`}
				/>

				<StatCard
					title="Avg. Payment Velocity"
					value={data.avgPaymentDays > 0 ? `${data.avgPaymentDays} days` : "—"}
					icon={<TrendingUp className="w-5 h-5" />}
					benchmark={data.avgPaymentDays > 0 ? adpBenchmark : undefined}
					type="velocity"
					subtitle="Industry benchmark: 18 days"
				/>
			</motion.div>

			{/* ── Section 3: Charts Row ── */}
			<motion.div
				variants={itemVariants}
				className="grid grid-cols-1 lg:grid-cols-2 gap-6"
			>
				{/* Left Chart: Billed vs Collected Trend */}
				<Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4">
					<div>
						<h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
							Billed vs. Collected Trend
						</h3>
						<p className="text-xs text-slate-400">
							Comparing your invoice billing to cash collected over the last 6
							months.
						</p>
					</div>

					<div className="h-72 w-full">
						<ResponsiveContainer width="100%" height="100%" minWidth={0}>
							<ComposedChart
								data={data.monthlyTrend}
								margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="#e2e8f0"
									className="dark:stroke-slate-800/50"
								/>
								<XAxis
									dataKey="month"
									stroke="#94a3b8"
									fontSize={10}
									tickLine={false}
									axisLine={false}
									dy={8}
								/>
								<YAxis
									stroke="#94a3b8"
									fontSize={10}
									tickLine={false}
									axisLine={false}
									tickFormatter={(val) =>
										`₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
									}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#ffffff",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
										fontSize: "12px",
									}}
									formatter={(value: any) => [
										formatCurrency(Number(value), "INR"),
										"",
									]}
								/>
								<Legend
									verticalAlign="bottom"
									height={36}
									iconType="circle"
									wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
								/>
								<Bar
									dataKey="billed"
									name="Billed Amount"
									fill="#f7d057"
									radius={[4, 4, 0, 0]}
									barSize={24}
								/>
								<Line
									type="monotone"
									dataKey="collected"
									name="Collected Cash"
									stroke="#10b981"
									strokeWidth={2.5}
									dot={{ r: 4, strokeWidth: 2 }}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>
				</Card>

				{/* Right Chart: Outstanding by Client */}
				<Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4">
					<div className="flex justify-between items-start">
						<div>
							<h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
								Outstanding Debt by Client
							</h3>
							<p className="text-xs text-slate-400">
								Top 5 clients with unpaid balances, color-coded by aging
								severity.
							</p>
						</div>
						<Link
							href="/invoices?status=OVERDUE"
							className="text-xs font-bold text-emerald-600 dark:text-emerald-450 hover:underline"
						>
							View All Overdue →
						</Link>
					</div>

					<div className="h-72 w-full flex flex-col justify-between">
						{data.clientOutstanding && data.clientOutstanding.length > 0 ? (
							<>
								<div className="h-60 w-full">
									<ResponsiveContainer width="100%" height="100%" minWidth={0}>
										<BarChart
											data={data.clientOutstanding}
											layout="vertical"
											margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												horizontal={false}
												stroke="#e2e8f0"
												className="dark:stroke-slate-800/50"
											/>
											<XAxis
												type="number"
												stroke="#94a3b8"
												fontSize={10}
												tickLine={false}
												axisLine={false}
												tickFormatter={(val) =>
													`₹${
														val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
													}`
												}
											/>
											<YAxis
												dataKey="name"
												type="category"
												stroke="#94a3b8"
												fontSize={10}
												tickLine={false}
												axisLine={false}
												width={80}
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: "#ffffff",
													border: "1px solid #e2e8f0",
													borderRadius: "8px",
													fontSize: "12px",
												}}
												formatter={(value: any) => [
													formatCurrency(Number(value), "INR"),
													"Unpaid",
												]}
											/>
											<Bar
												dataKey="outstanding"
												radius={[0, 4, 4, 0]}
												barSize={12}
											>
												{data.clientOutstanding.map(
													(entry: any, index: number) => {
														// Red if outstanding is aged >30 days, else Amber
														const color =
															entry.ageMaxDays >= 30 ? "#ef4444" : "#f59e0b";
														return <Cell key={`cell-${index}`} fill={color} />;
													}
												)}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>

								{/* Aging Legend indicator */}
								<div className="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-450 pt-2 border-t border-slate-100 dark:border-slate-800/40">
									<div className="flex items-center gap-1.5">
										<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
										<span>Recent (&lt; 30 days overdue)</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="w-2.5 h-2.5 rounded-full bg-red-500" />
										<span>Aged (30+ days overdue)</span>
									</div>
								</div>
							</>
						) : (
							<div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
								No active outstanding invoices for any clients.
							</div>
						)}
					</div>
				</Card>
			</motion.div>

			{/* ── Section 4: Actionable Overdue Invoices Table ── */}
			<motion.div variants={itemVariants} className="space-y-3">
				<div className="flex justify-between items-center">
					<h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
						<Clock className="w-4 h-4 text-emerald-650" />
						<span>Overdue & Outstanding Invoices</span>
					</h3>
					<Link
						href="/invoices"
						className="text-xs font-bold text-emerald-600 dark:text-emerald-450 hover:underline flex items-center gap-0.5"
					>
						<span>View All Invoices</span>
						<ArrowRight className="w-3 h-3" />
					</Link>
				</div>

				<div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-left min-w-[700px]">
							<thead>
								<tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
									<th className="py-3 px-4">Invoice #</th>
									<th className="py-3 px-4">Client</th>
									<th className="py-3 px-4 text-right">Amount</th>
									<th className="py-3 px-4">Due Date</th>
									<th className="py-3 px-4">Age / Days Overdue</th>
									<th className="py-3 px-4 text-center">Status</th>
									<th className="py-3 px-4 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="text-xs divide-y divide-slate-150/40 dark:divide-slate-850/20">
								{data.topOutstanding && data.topOutstanding.length > 0 ? (
									data.topOutstanding.map((inv: any) => {
										const dueDateObj = new Date(inv.dueDate);
										const ageDays = differenceInDays(today, dueDateObj);

										let ageText = "";
										let ageColor = "";
										if (ageDays < 0) {
											ageText = `Due in ${Math.abs(ageDays)} days`;
											ageColor =
												"text-emerald-600 dark:text-emerald-400 font-semibold";
										} else if (ageDays === 0) {
											ageText = "Due today";
											ageColor = "text-amber-500 font-semibold";
										} else if (ageDays <= 7) {
											ageText = `${ageDays} days overdue`;
											ageColor =
												"text-amber-600 dark:text-amber-450 font-semibold";
										} else if (ageDays <= 30) {
											ageText = `${ageDays} days overdue`;
											ageColor =
												"text-orange-500 dark:text-orange-400 font-semibold";
										} else {
											ageText = `${ageDays} days overdue`;
											ageColor = "text-red-650 dark:text-red-400 font-bold";
										}

										return (
											<tr
												key={inv.id}
												className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors"
											>
												<td className="py-3 px-4 font-mono font-bold text-slate-850 dark:text-slate-150">
													<Link
														href={`/invoices/${inv.id}`}
														className="hover:text-emerald-500 hover:underline"
													>
														{inv.invoiceNumber}
													</Link>
												</td>
												<td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-350">
													{inv.client?.name}
												</td>
												<td className="py-3 px-4 text-right font-bold text-slate-850 dark:text-slate-150">
													{formatCurrency(Number(inv.grandTotal), inv.currency)}
												</td>
												<td className="py-3 px-4 text-slate-450 font-medium">
													{formatDate(inv.dueDate)}
												</td>
												<td className={`py-3 px-4 text-xs ${ageColor}`}>
													{ageText}
												</td>
												<td className="py-3 px-4 text-center">
													<StatusBadge status={inv.status} />
												</td>
												<td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
													{inv.client?.email &&
														(inv.status === "SENT" ||
															inv.status === "OVERDUE" ||
															inv.status === "PARTIAL") && (
															<Button
																variant="ghost"
																size="sm"
																disabled={actionLoadingId === inv.id}
																onClick={() =>
																	handleSendSingleReminder(
																		inv.id,
																		inv.invoiceNumber,
																		inv.client.name,
																		inv.client.email
																	)
																}
																className="h-7 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
															>
																{actionLoadingId === inv.id ? (
																	<RefreshCw className="w-3.5 h-3.5 animate-spin" />
																) : (
																	<>
																		<Send className="w-3 h-3 mr-1" />
																		<span>Remind</span>
																	</>
																)}
															</Button>
														)}
													<Button
														variant="ghost"
														size="sm"
														disabled={actionLoadingId === inv.id}
														onClick={() =>
															handleMarkPaid(
																inv.id,
																inv.invoiceNumber,
																Number(inv.grandTotal)
															)
														}
														className="h-7 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
													>
														{actionLoadingId === inv.id ? (
															<RefreshCw className="w-3.5 h-3.5 animate-spin" />
														) : (
															<>
																<Check className="w-3 h-3 mr-1" />
																<span>Paid</span>
															</>
														)}
													</Button>
												</td>
											</tr>
										);
									})
								) : (
									<tr>
										<td
											colSpan={7}
											className="py-8 text-center text-slate-450 italic"
										>
											All caught up! No active outstanding invoices. 🎉
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</motion.div>

			{/* ── Section 4.5: Engagement Insights Section ── */}
			{data.viewAnalytics && (
				<motion.div variants={itemVariants} className="space-y-3">
					<h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
						<Eye className="w-4 h-4 text-emerald-650" />
						<span>Engagement Insights</span>
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{/* Total Views Card */}
						<Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-xs">
							<div className="flex justify-between items-start">
								<div className="space-y-1 text-left">
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Invoice Views</p>
									<p className="text-2xl font-black text-slate-800 dark:text-slate-100">{data.viewAnalytics.totalViews}</p>
								</div>
								<div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/20 text-sky-500">
									<Eye className="w-4 h-4" />
								</div>
							</div>
						</Card>

						{/* Viewed but Unpaid */}
						<Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-xs">
							<div className="flex justify-between items-start">
								<div className="space-y-1 text-left">
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viewed & Unpaid</p>
									<p className={`text-2xl font-black ${data.viewAnalytics.viewedNotPaidCount > 0 ? "text-amber-550 dark:text-amber-400" : "text-slate-800 dark:text-slate-100"}`}>
										{data.viewAnalytics.viewedNotPaidCount}
									</p>
								</div>
								<div className={`p-2 rounded-lg ${data.viewAnalytics.viewedNotPaidCount > 0 ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500" : "bg-slate-50 dark:bg-slate-800 text-slate-400"}`}>
									<AlertTriangle className="w-4 h-4" />
								</div>
							</div>
						</Card>

						{/* Never Viewed */}
						<Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-xs">
							<div className="flex justify-between items-start">
								<div className="space-y-1 text-left">
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Never Viewed</p>
									<p className={`text-2xl font-black ${data.viewAnalytics.neverViewedCount > 0 ? "text-red-650 dark:text-red-400" : "text-slate-800 dark:text-slate-100"}`}>
										{data.viewAnalytics.neverViewedCount}
									</p>
								</div>
								<div className={`p-2 rounded-lg ${data.viewAnalytics.neverViewedCount > 0 ? "bg-red-50 dark:bg-red-950/20 text-red-500" : "bg-slate-50 dark:bg-slate-800 text-slate-400"}`}>
									<Clock className="w-4 h-4" />
								</div>
							</div>
							{data.viewAnalytics.neverViewedCount > 0 && (
								<div className="mt-2 text-left">
									<Link href="/invoices" className="text-[10px] font-bold text-red-500 hover:underline">
										Send reminders &rarr;
									</Link>
								</div>
							)}
						</Card>

						{/* Most Viewed */}
						<Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-xs">
							<div className="flex justify-between items-start">
								<div className="space-y-1 text-left min-w-0 flex-1">
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Most Viewed Invoice</p>
									{data.viewAnalytics.mostViewedInvoice ? (
										<div className="min-w-0 truncate">
											<Link 
												href={`/invoices/${data.viewAnalytics.mostViewedInvoice.id}`}
												className="text-sm font-bold text-emerald-600 dark:text-emerald-450 hover:underline block truncate"
											>
												#{data.viewAnalytics.mostViewedInvoice.invoiceNumber}
											</Link>
											<p className="text-[10px] text-slate-450 font-medium">({data.viewAnalytics.mostViewedInvoice.viewCount} views)</p>
										</div>
									) : (
										<p className="text-sm font-semibold text-slate-450">None shared yet</p>
									)}
								</div>
								<div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 shrink-0">
									<TrendingUp className="w-4 h-4" />
								</div>
							</div>
						</Card>
					</div>
				</motion.div>
			)}

			{/* ── Section 5: Quick CRM Actions Panel ── */}
			<motion.div variants={itemVariants} className="space-y-3">
				<h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
					Quick Actions
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Link href="/invoices/new" className="block w-full">
						<div className="flex items-center gap-3 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer transition-all hover:scale-[1.01] group">
							<div className="p-2 rounded-lg bg-emerald-500 text-white border border-emerald-400/20">
								<Plus className="w-5 h-5" />
							</div>
							<div className="flex-1 min-w-0 text-left">
								<h4 className="text-sm font-bold tracking-wide">
									Create Invoice
								</h4>
								<p className="text-xs text-emerald-100/90 truncate font-medium">
									Issue professional GST tax invoices
								</p>
							</div>
							<ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
						</div>
					</Link>

					<Link href="/clients" className="block w-full">
						<div className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-950/50 shadow-sm cursor-pointer transition-all hover:scale-[1.01] group">
							<div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
								<Users className="w-5 h-5" />
							</div>
							<div className="flex-1 min-w-0 text-left">
								<h4 className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
									Add New Customer
								</h4>
								<p className="text-xs text-slate-450 dark:text-slate-500 truncate font-medium">
									Build registry & track credit terms
								</p>
							</div>
							<ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-650 group-hover:translate-x-0.5 transition-transform group-hover:text-indigo-500" />
						</div>
					</Link>

					<Link href="/reports" className="block w-full">
						<div className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-950/50 shadow-sm cursor-pointer transition-all hover:scale-[1.01] group">
							<div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
								<BarChart3 className="w-5 h-5" />
							</div>
							<div className="flex-1 min-w-0 text-left">
								<h4 className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
									GSTR / Tax Reports
								</h4>
								<p className="text-xs text-slate-450 dark:text-slate-500 truncate font-medium">
									Export GST audit & transaction ledgers
								</p>
							</div>
							<ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-650 group-hover:translate-x-0.5 transition-transform group-hover:text-blue-500" />
						</div>
					</Link>
				</div>
			</motion.div>

			{/* ── Send Batch Reminders Dialog ── */}
			<Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
				<DialogContent className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-850 p-6 rounded-xl">
					<DialogHeader className="text-left space-y-1">
						<DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
							<Send className="w-4 h-4 text-emerald-650" />
							<span>Send Overdue Reminders</span>
						</DialogTitle>
						<DialogDescription className="text-xs text-slate-450 leading-relaxed">
							Select which overdue accounts will receive a payment reminder
							via email and/or WhatsApp.
						</DialogDescription>
					</DialogHeader>

					{overdueInvoices.length > 0 ? (
						<div className="max-h-60 overflow-y-auto space-y-2.5 py-3 border-t border-b border-slate-100 dark:border-slate-800/60 my-4 text-left">
							{overdueInvoices.map((inv: any) => {
								const hasEmail = !!inv.client?.email;
								const hasPhone = !!inv.client?.phone;
								const canDeliver = hasEmail || hasPhone;
								const isChecked = selectedOverdueIds.includes(inv.id);

								return (
									<div
										key={inv.id}
										onClick={() => canDeliver && toggleSelectOverdue(inv.id)}
										className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
											!canDeliver
												? "opacity-50 cursor-not-allowed border-slate-150 bg-slate-50/50"
												: isChecked
												? "border-emerald-500/60 bg-emerald-50/20 text-emerald-950 dark:text-emerald-350 dark:border-emerald-900/40"
												: "border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
										}`}
									>
										<div className="flex items-center gap-2.5">
											<div
												className={`w-4 h-4 rounded border flex items-center justify-center ${
													isChecked
														? "bg-emerald-500 border-emerald-500 text-white"
														: "border-slate-350 dark:border-slate-700"
												}`}
											>
												{isChecked && <Check className="w-3 h-3 stroke-[3]" />}
											</div>
											<div className="space-y-0.5">
												<span className="font-bold block text-slate-850 dark:text-slate-200">
													{inv.invoiceNumber} — {inv.client?.name}
												</span>
												<div className="text-[10px] text-slate-450 font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
													{hasEmail ? (
														<span>📧 {inv.client.email}</span>
													) : null}
													{hasEmail && hasPhone ? (
														<span className="text-slate-350 dark:text-slate-700">|</span>
													) : null}
													{hasPhone ? (
														<span className="text-emerald-600 dark:text-emerald-450 font-semibold">💬 WhatsApp</span>
													) : null}
													{!canDeliver ? (
														<span className="text-red-500 font-semibold">⚠️ No contact info</span>
													) : null}
												</div>
											</div>
										</div>
										<span className="font-extrabold text-slate-850 dark:text-slate-100 font-mono">
											{formatCurrency(inv.outstandingINR, "INR")}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<p className="text-xs text-slate-450 italic py-6 text-center">
							No deliverable overdue invoices found.
						</p>
					)}

					<DialogFooter className="flex items-center justify-end gap-2 text-xs">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsReminderOpen(false)}
							className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer h-9 px-4 rounded-lg"
						>
							Cancel
						</Button>
						<Button
							disabled={selectedOverdueIds.length === 0 || remindersSending}
							onClick={sendBatchReminders}
							className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 rounded-lg flex items-center gap-1.5 cursor-pointer"
						>
							{remindersSending ? (
								<>
									<RefreshCw className="w-3.5 h-3.5 animate-spin" />
									<span>Sending...</span>
								</>
							) : (
								<>
									<Send className="w-3.5 h-3.5" />
									<span>
										Send {selectedOverdueIds.length} Reminder
										{selectedOverdueIds.length === 1 ? "" : "s"}
									</span>
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</motion.div>
	);
}

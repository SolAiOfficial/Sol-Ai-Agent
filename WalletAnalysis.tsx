"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
  Coins,
  ArrowRightLeft,
  PieChart,
  History,
  Repeat,
} from "lucide-react"
import type React from "react" // Import React

const TokenLogo = ({ symbol }: { symbol: string }) => {
  const [error, setError] = useState(false)
  const logoUrl = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${symbol}/logo.png`

  if (error) {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 text-xs font-bold">
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={logoUrl || "/placeholder.svg"}
      alt={`${symbol} logo`}
      className="w-6 h-6 rounded-full"
      onError={() => setError(true)}
    />
  )
}

interface Token {
  address: string
  balance: number
  chainId: string
  decimals: number
  logoURI: string
  name: string
  priceUsd: number
  symbol: string
  uiAmount: number
  valueUsd: number
}

interface Transaction {
  balanceChange: {
    address: string
    amount: number
    decimals: number
    logoURI: string
    name: string
    symbol: string
    uiAmount: number
  }[]
  blockNumber: number
  blockTime: string
  contractLabel: {
    address: string
    metadata: {
      icon: string
    }
    name: string
  }
  fee: number
  formattedBlockTime: string
  from: string
  mainAction: string
  status: boolean
  to: string
  txHash: string
}

interface WalletAnalysisProps {
  totalValue: number
  tokenCount: number
  topTokens: Token[]
  recentTransactions: Transaction[]
  swapActivity: string
  overallPNL: string
  pnlPercentage: string
  pnlByToken: { token: string; amount: string }[]
  analysis: string
}

const TabButton = ({
  isActive,
  onClick,
  icon: Icon,
  label,
}: {
  isActive: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) => (
  <button
    className={cn(
      "flex flex-col items-center justify-center py-3 px-1 flex-1 transition-all duration-300 relative overflow-hidden",
      isActive ? "text-purple-400 bg-gray-800" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800",
    )}
    onClick={onClick}
  >
    <Icon className="w-5 h-5 mb-1" />
    <span className="text-xs">{label}</span>
    {isActive && (
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"
        layoutId="activeTab"
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    )}
  </button>
)

const DataCard = ({
  title,
  value,
  icon: Icon,
  color,
}: { title: string; value: string; icon: React.ElementType; color: string }) => (
  <div className={`bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-white/10 relative overflow-hidden`}>
    <div className="flex justify-between items-center">
      <div>
        <p className="text-xs text-gray-400">{title}</p>
        <p className={`text-lg sm:text-xl font-bold text-${color}-400`}>{value}</p>
      </div>
      <Icon className={`w-8 h-8 sm:w-10 sm:h-10 text-${color}-500 opacity-50`} />
    </div>
    <div className="absolute -bottom-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-transparent to-gray-700 rounded-full opacity-20" />
  </div>
)

export function WalletAnalysis({
  totalValue,
  tokenCount,
  topTokens,
  recentTransactions,
  swapActivity,
  overallPNL,
  pnlPercentage,
  pnlByToken,
  analysis,
}: WalletAnalysisProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const hasData = totalValue > 0 || tokenCount > 0 || topTokens.length > 0 || recentTransactions.length > 0

  if (!hasData) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-gray-300">
        <p className="text-purple-400 text-lg font-semibold mb-4">No Portfolio Data Available</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The wallet may be new or have no transaction history</li>
          <li>There might have been an error retrieving the wallet data</li>
          <li>The wallet address might be incorrect</li>
        </ul>
        <p className="mt-4 text-purple-400">
          Please check the wallet address and try again, or try a different wallet.
        </p>
      </div>
    )
  }

  const containerStyle = {
    transform: "translateZ(0)",
    perspective: "1000px",
  }

  return (
    <div
      style={containerStyle}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-lg shadow-purple-400/20 transition-all duration-300 hover:shadow-purple-400/30 hover:scale-[1.01]"
    >
      <div className="p-2">
        <div className="border-b border-gray-800">
          <div className="flex w-full">
            <TabButton
              isActive={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={PieChart}
              label="Overview"
            />
            <TabButton
              isActive={activeTab === "tokens"}
              onClick={() => setActiveTab("tokens")}
              icon={Coins}
              label="Tokens"
            />
            <TabButton
              isActive={activeTab === "transactions"}
              onClick={() => setActiveTab("transactions")}
              icon={History}
              label="Transactions"
            />
            <TabButton
              isActive={activeTab === "swaps"}
              onClick={() => setActiveTab("swaps")}
              icon={Repeat}
              label="Swaps"
            />
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DataCard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon={DollarSign} color="green" />
                  <DataCard title="Token Count" value={tokenCount.toString()} icon={Coins} color="purple" />
                  <DataCard
                    title="Overall PNL"
                    value={overallPNL}
                    icon={overallPNL.startsWith("-") ? ArrowDownRight : ArrowUpRight}
                    color={overallPNL.startsWith("-") ? "red" : "green"}
                  />
                  <DataCard
                    title="PNL %"
                    value={pnlPercentage}
                    icon={Activity}
                    color={pnlPercentage.startsWith("-") ? "red" : "green"}
                  />
                </div>
                {pnlByToken.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-purple-400">PNL Breakdown by Token</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {pnlByToken.map((item, index) => (
                        <div key={index} className="bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                          <p className="text-base font-medium text-gray-300">{item.token}</p>
                          <p
                            className={`text-lg font-bold ${item.amount.startsWith("-") ? "text-red-400" : "text-green-400"}`}
                          >
                            {item.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "tokens" && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-purple-400">Top Tokens Held</h3>
                {topTokens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-800">
                          <TableHead className="text-left text-gray-400">Token</TableHead>
                          <TableHead className="text-right text-gray-400">Balance</TableHead>
                          <TableHead className="text-right text-gray-400">Value (USD)</TableHead>
                          <TableHead className="text-right text-gray-400">Price (USD)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topTokens.map((token, index) => (
                          <TableRow key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                            <TableCell className="flex items-center py-2">
                              <img
                                src={token.logoURI || "/placeholder.svg"}
                                alt={token.name || "Unknown Token"}
                                className="w-6 h-6 mr-2 rounded-full"
                              />
                              <span className="font-medium text-gray-200">{token.name || "Unknown Token"}</span>
                              <span className="ml-2 text-xs text-gray-400">({token.symbol || "N/A"})</span>
                            </TableCell>
                            <TableCell className="text-right text-gray-300">
                              {token.uiAmount?.toFixed(4) || "N/A"}
                            </TableCell>
                            <TableCell className="text-right text-gray-300">
                              ${token.valueUsd?.toFixed(2) || "N/A"}
                            </TableCell>
                            <TableCell className="text-right text-gray-300">
                              ${token.priceUsd?.toFixed(4) || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No tokens found in this wallet.</p>
                )}
              </div>
            )}
            {activeTab === "transactions" && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-purple-400">Recent Transactions</h3>
                <div className="space-y-3">
                  {recentTransactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:border-purple-500 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-purple-400">{transaction.mainAction}</span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(transaction.blockTime), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <img
                            src={transaction.balanceChange[0]?.logoURI || "/placeholder.svg"}
                            alt={transaction.balanceChange[0]?.symbol}
                            className="w-6 h-6 mr-2 rounded-full"
                          />
                          <span className="text-sm text-gray-300">{transaction.balanceChange[0]?.symbol}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-300">
                          {transaction.balanceChange[0]?.uiAmount.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "swaps" && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-purple-400">Swap Activity</h3>
                {swapActivity === "No swap activity data available." ? (
                  <p className="text-gray-400 italic">{swapActivity}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm">Time</th>
                          <th className="text-left py-2 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm">From</th>
                          <th className="text-center py-2 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm"></th>
                          <th className="text-left py-2 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm">To</th>
                          <th className="text-right py-2 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm">Amount</th>
                          <th className="text-right py-2 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm">
                            USD Equivalent
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {swapActivity.split("\n\n").map((swap, index) => {
                          const [swapHeader, ...swapDetails] = swap.split("\n")
                          const [, timestamp] = swapDetails[0].split(": ")
                          const [, fromToken] = swapDetails[1].split(": ")
                          const [, toToken] = swapDetails[2].split(": ")
                          const [, amount] = swapDetails[3].split(": ")
                          const [, usdEquivalent] = swapDetails[4].split(": ")

                          return (
                            <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                              <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-300">{timestamp}</td>
                              <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-200">
                                <div className="flex items-center">
                                  <TokenLogo symbol={fromToken} />
                                  <span className="ml-2">{fromToken}</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 sm:px-4 text-center">
                                <ArrowRightLeft className="h-4 w-4 text-purple-400 inline-block" />
                              </td>
                              <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-200">
                                <div className="flex items-center">
                                  <TokenLogo symbol={toToken} />
                                  <span className="ml-2">{toToken}</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm text-gray-300">
                                {amount}
                              </td>
                              <td className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm text-gray-300">
                                {usdEquivalent}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}


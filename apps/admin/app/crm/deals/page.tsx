"use client";

import { useEffect, useState, useCallback } from "react";
import { getDealsByStage, getDealStages, createDefaultDealStages, updateDeal } from "@/app/actions/crm/deals";
import { createDefaultTenantForUser } from "@/app/actions/crm/setup";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Temporary types until database types are regenerated
type DealStage = {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  color: string;
  is_closed: boolean;
  created_at: string;
};

type Deal = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  company_id: string | null;
  name: string;
  stage_id: string;
  value: number;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  description: string | null;
  tags: string[] | null;
  custom_fields: Record<string, any> | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  stage?: DealStage | null;
};

const ITEM_TYPE = "DEAL";

interface DragItem {
  type: string;
  id: string;
  stageId: string;
}

// Draggable Deal Card Component
function DealCard({
  deal,
  formatCurrency,
}: {
  deal: Deal;
  formatCurrency: (amount: number, currency?: string) => string;
}) {
  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: ITEM_TYPE,
    item: { type: ITEM_TYPE, id: deal.id, stageId: deal.stage_id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [deal.id, deal.stage_id]);

  return (
    <div
      ref={drag}
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 ring-2 ring-blue-500 shadow-lg" : ""
      }`}
    >
      <Link href={`/crm/deals/${deal.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
          {deal.name}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {deal.contact
            ? `${deal.contact.first_name} ${deal.contact.last_name}`
            : deal.company?.name || "No contact"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(Number(deal.value || 0), deal.currency || "USD")}
          </span>
          {deal.probability !== null && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-400">
              {deal.probability}%
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

// Droppable Stage Column Component
function StageColumn({
  stage,
  deals,
  formatCurrency,
  onDrop,
}: {
  stage: DealStage;
  deals: Deal[];
  formatCurrency: (amount: number, currency?: string) => string;
  onDrop: (dealId: string, targetStageId: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: ITEM_TYPE,
    drop: (item) => {
      if (item.stageId !== stage.id) {
        onDrop(item.id, stage.id);
      }
    },
    canDrop: (item) => item.stageId !== stage.id,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [stage.id, onDrop]);

  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-all duration-200 ${
        isOver && canDrop
          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : canDrop
          ? "ring-1 ring-gray-300 dark:ring-gray-600"
          : ""
      }`}
      style={{ borderTop: `4px solid ${stage.color}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} • {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {deals.length === 0 ? (
          <div
            className={`text-center py-8 text-sm border-2 border-dashed rounded-lg transition-colors ${
              isOver && canDrop
                ? "border-blue-400 text-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                : "border-gray-200 text-gray-400 dark:border-gray-700"
            }`}
          >
            {isOver && canDrop ? "Drop here" : "No deals in this stage"}
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} formatCurrency={formatCurrency} />
          ))
        )}
      </div>
    </div>
  );
}

// Main Pipeline Content (needs to be inside DndProvider)
function PipelineContent({
  stages,
  dealsByStage,
  setDealsByStage,
}: {
  stages: DealStage[];
  dealsByStage: Record<string, Deal[]>;
  setDealsByStage: React.Dispatch<React.SetStateAction<Record<string, Deal[]>>>;
}) {
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDrop = useCallback(
    async (dealId: string, targetStageId: string) => {
      // Optimistically update the UI
      setDealsByStage((prev) => {
        const newState = { ...prev };
        let movedDeal: Deal | undefined;

        // Find and remove the deal from its current stage
        for (const stageId of Object.keys(newState)) {
          const dealIndex = newState[stageId]?.findIndex((d) => d.id === dealId);
          if (dealIndex !== undefined && dealIndex > -1) {
            movedDeal = { ...newState[stageId][dealIndex], stage_id: targetStageId };
            newState[stageId] = newState[stageId].filter((d) => d.id !== dealId);
            break;
          }
        }

        // Add the deal to the target stage
        if (movedDeal) {
          if (!newState[targetStageId]) {
            newState[targetStageId] = [];
          }
          newState[targetStageId] = [...newState[targetStageId], movedDeal];
        }

        return newState;
      });

      // Update the database
      try {
        await updateDeal(dealId, { stage_id: targetStageId });
      } catch (error) {
        console.error("Error updating deal stage:", error);
        // Reload data on error to revert optimistic update
        window.location.reload();
      }
    },
    [setDealsByStage]
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const deals = dealsByStage[stage.id] || [];
        return (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={deals}
            formatCurrency={formatCurrency}
            onDrop={handleDrop}
          />
        );
      })}
    </div>
  );
}

export default function DealsPage() {
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({});
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsTenant, setNeedsTenant] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const setupTenant = async () => {
    try {
      setLoading(true);
      await createDefaultTenantForUser();
      setNeedsTenant(false);
      await loadData();
    } catch (error) {
      console.error("Error setting up tenant:", error);
      alert("Failed to set up tenant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      let dealStages = await getDealStages();
      
      // Create default stages if none exist
      if (dealStages.length === 0) {
        dealStages = await createDefaultDealStages();
      }
      
      setStages(dealStages);
      const deals = await getDealsByStage();
      setDealsByStage(deals);
      setNeedsTenant(false);
    } catch (error: any) {
      console.error("Error loading deals:", error);
      if (error.message?.includes("No tenant found")) {
        setNeedsTenant(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !needsTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading deals...</div>
      </div>
    );
  }

  if (needsTenant) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Deals" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Tenant Setup Required
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              You need a tenant to use CRM features. Click below to create a default tenant.
            </p>
            <Button onClick={setupTenant} disabled={loading}>
              {loading ? "Setting up..." : "Create Default Tenant"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Deals" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">Deals Pipeline</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Track your sales opportunities through the pipeline
            </p>
          </div>
          <Link href="/crm/deals/new" className="self-start sm:self-auto">
            <Button>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Deal
            </Button>
          </Link>
        </div>

        {/* Kanban Board with Drag and Drop */}
        <DndProvider backend={HTML5Backend}>
          <PipelineContent
            stages={stages}
            dealsByStage={dealsByStage}
            setDealsByStage={setDealsByStage}
          />
        </DndProvider>
      </div>
    </div>
  );
}

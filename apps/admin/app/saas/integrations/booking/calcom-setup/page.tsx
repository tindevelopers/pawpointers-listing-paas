"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

type Listing = { id: string; title: string };
type EventType = { id: string; name: string; slug: string; active: boolean };
type TeamMember = {
  id: string;
  user_id: string;
  event_type_ids: string[];
  round_robin_enabled: boolean;
  calcom_user_id?: string | null;
  calcom_username?: string | null;
  calcom_calendar_connected?: boolean;
  active: boolean;
};
type Mapping = {
  id?: string;
  event_type_id: string;
  external_event_type_id: string;
  round_robin_enabled: boolean;
  active: boolean;
};

export default function CalComSetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});

  const load = async (requestedListingId?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const query = requestedListingId
        ? `?listingId=${encodeURIComponent(requestedListingId)}`
        : "";
      const res = await fetch(`/api/booking/calcom-setup${query}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load Cal.com setup.");
      }

      const d = data?.data || {};
      setIntegrationId(d.integrationId || null);
      setListingId(d.listingId || null);
      setListings((d.listings || []) as Listing[]);
      setEventTypes((d.eventTypes || []) as EventType[]);
      setTeamMembers((d.teamMembers || []) as TeamMember[]);

      const byEventType: Record<string, Mapping> = {};
      for (const eventType of (d.eventTypes || []) as EventType[]) {
        byEventType[eventType.id] = {
          event_type_id: eventType.id,
          external_event_type_id: "",
          round_robin_enabled: true,
          active: true,
        };
      }
      for (const mapping of (d.mappings || []) as Mapping[]) {
        if (!mapping?.event_type_id) continue;
        byEventType[mapping.event_type_id] = {
          ...byEventType[mapping.event_type_id],
          ...mapping,
        };
      }
      setMappings(byEventType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Cal.com setup.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const serviceOptions = useMemo(
    () => eventTypes.map((e) => ({ id: e.id, label: e.name })),
    [eventTypes]
  );

  const toggleEligibility = (memberId: string, eventTypeId: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const has = (m.event_type_ids || []).includes(eventTypeId);
        return {
          ...m,
          event_type_ids: has
            ? (m.event_type_ids || []).filter((id) => id !== eventTypeId)
            : [...(m.event_type_ids || []), eventTypeId],
        };
      })
    );
  };

  const save = async () => {
    if (!integrationId || !listingId) {
      setError("Missing integration or listing context.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        integrationId,
        listingId,
        teamMembers: teamMembers.map((m) => ({
          id: m.id,
          eventTypeIds: m.event_type_ids || [],
          roundRobinEnabled: !!m.round_robin_enabled,
          calcomUserId: m.calcom_user_id || "",
          calcomUsername: m.calcom_username || "",
          calcomCalendarConnected: !!m.calcom_calendar_connected,
        })),
        mappings: Object.values(mappings).map((m) => ({
          eventTypeId: m.event_type_id,
          externalEventTypeId: m.external_event_type_id,
          roundRobinEnabled: !!m.round_robin_enabled,
          active: !!m.active,
        })),
      };
      const res = await fetch("/api/booking/calcom-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to save Cal.com setup.");
      }
      setSuccess("Cal.com service + staff mappings saved.");
      await load(listingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save Cal.com setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Cal.com Merchant Setup" />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
              Cal.com Merchant Setup
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Configure service-to-event mappings and staff eligibility for round robin booking.
            </p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Mappings"}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Label htmlFor="listingId">Listing</Label>
          <select
            id="listingId"
            value={listingId || ""}
            onChange={(e) => {
              const next = e.target.value || null;
              setListingId(next);
              if (next) {
                load(next);
              }
            }}
            className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            disabled={loading}
          >
            <option value="">Select listing</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service to Cal.com Event Mapping</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Map each Pawpointers service (`event_types`) to a Cal.com event type id.
          </p>

          <div className="mt-4 space-y-4">
            {eventTypes.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No services found for this listing. Create event types first.
              </p>
            )}
            {eventTypes.map((service) => {
              const mapping = mappings[service.id] || {
                event_type_id: service.id,
                external_event_type_id: "",
                round_robin_enabled: true,
                active: true,
              };
              return (
                <div key={service.id} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-4 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</div>
                  <Input
                    type="text"
                    placeholder="Cal.com event type id"
                    value={mapping.external_event_type_id || ""}
                    onChange={(e) =>
                      setMappings((prev) => ({
                        ...prev,
                        [service.id]: {
                          ...mapping,
                          external_event_type_id: e.target.value,
                        },
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={!!mapping.round_robin_enabled}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [service.id]: {
                            ...mapping,
                            round_robin_enabled: e.target.checked,
                          },
                        }))
                      }
                    />
                    Round robin
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={!!mapping.active}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [service.id]: {
                            ...mapping,
                            active: e.target.checked,
                          },
                        }))
                      }
                    />
                    Active
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Eligibility</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Assign which staff can host each service and link Cal.com user identity.
          </p>

          <div className="mt-4 space-y-4">
            {teamMembers.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No team members found for this listing.
              </p>
            )}
            {teamMembers.map((member) => (
              <div key={member.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                  Team member: {member.user_id}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input
                    type="text"
                    placeholder="Cal.com user id"
                    value={member.calcom_user_id || ""}
                    onChange={(e) =>
                      setTeamMembers((prev) =>
                        prev.map((m) =>
                          m.id === member.id ? { ...m, calcom_user_id: e.target.value } : m
                        )
                      )
                    }
                  />
                  <Input
                    type="text"
                    placeholder="Cal.com username"
                    value={member.calcom_username || ""}
                    onChange={(e) =>
                      setTeamMembers((prev) =>
                        prev.map((m) =>
                          m.id === member.id ? { ...m, calcom_username: e.target.value } : m
                        )
                      )
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={!!member.calcom_calendar_connected}
                      onChange={(e) =>
                        setTeamMembers((prev) =>
                          prev.map((m) =>
                            m.id === member.id
                              ? { ...m, calcom_calendar_connected: e.target.checked }
                              : m
                          )
                        )
                      }
                    />
                    Calendar connected
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {serviceOptions.map((service) => (
                    <label
                      key={service.id}
                      className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={(member.event_type_ids || []).includes(service.id)}
                        onChange={() => toggleEligibility(member.id, service.id)}
                      />
                      {service.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

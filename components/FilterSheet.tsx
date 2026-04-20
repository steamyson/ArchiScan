import { useEffect, useState } from "react";
import { Sheet, YStack, XStack, Text, Input, Button } from "tamagui";
import { X } from "phosphor-react-native";
import { useHerbariumStore } from "../stores/herbariumStore";
import type { HerbariumFilters } from "../lib/herbarium";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
}

function toInputDate(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function fromInputDate(value: string, endOfDay: boolean): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const d = new Date(endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function FilterSheet({ open, onClose }: FilterSheetProps) {
  const filters = useHerbariumStore((s) => s.filters);
  const setFilters = useHerbariumStore((s) => s.setFilters);
  const clearFilters = useHerbariumStore((s) => s.clearFilters);

  const [style, setStyle] = useState("");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setStyle(filters.style ?? "");
    setTag(filters.tag ?? "");
    setSearch(filters.searchQuery ?? "");
    setDateFrom(toInputDate(filters.dateFrom));
    setDateTo(toInputDate(filters.dateTo));
  }, [open, filters]);

  const apply = () => {
    const next: HerbariumFilters = {};
    if (style.trim()) {
      next.style = style.trim();
    }
    if (tag.trim()) {
      next.tag = tag.trim();
    }
    if (search.trim()) {
      next.searchQuery = search.trim();
    }
    const from = fromInputDate(dateFrom, false);
    if (from) {
      next.dateFrom = from;
    }
    const to = fromInputDate(dateTo, true);
    if (to) {
      next.dateTo = to;
    }
    setFilters(next);
    onClose();
  };

  const reset = () => {
    clearFilters();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) {
          onClose();
        }
      }}
      snapPointsMode="fit"
      dismissOnSnapToBottom
    >
      <Sheet.Overlay bg="rgba(0,0,0,0.5)" />
      <Sheet.Frame
        bg="$backgroundStrong"
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        padding="$5"
        gap="$4"
      >
        <Sheet.Handle bg="#2a2a2a" />
        <XStack ai="center" jc="space-between">
          <Text fos={17} fontWeight="700" color="$color">
            Filter scans
          </Text>
          <Button
            chromeless
            onPress={onClose}
            icon={<X size={20} color="#888880" weight="regular" />}
            aria-label="Close filter"
          />
        </XStack>

        <YStack gap="$2">
          <Text fos={12} fontWeight="600" color="$colorMuted" tt="uppercase" ls={1.2}>
            Search address
          </Text>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="e.g. Prinsengracht"
            
            autoCapitalize="none"
            bg="$background"
            borderColor="$borderColor"
            color="$color"
          />
        </YStack>

        <YStack gap="$2">
          <Text fos={12} fontWeight="600" color="$colorMuted" tt="uppercase" ls={1.2}>
            Style contains
          </Text>
          <Input
            value={style}
            onChangeText={setStyle}
            placeholder="e.g. Art Deco"
            
            autoCapitalize="none"
            bg="$background"
            borderColor="$borderColor"
            color="$color"
          />
        </YStack>

        <YStack gap="$2">
          <Text fos={12} fontWeight="600" color="$colorMuted" tt="uppercase" ls={1.2}>
            Tag
          </Text>
          <Input
            value={tag}
            onChangeText={setTag}
            placeholder="e.g. ornament"
            
            autoCapitalize="none"
            bg="$background"
            borderColor="$borderColor"
            color="$color"
          />
        </YStack>

        <XStack gap="$3">
          <YStack flex={1} gap="$2">
            <Text fos={12} fontWeight="600" color="$colorMuted" tt="uppercase" ls={1.2}>
              From
            </Text>
            <Input
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              
              autoCapitalize="none"
              bg="$background"
              borderColor="$borderColor"
              color="$color"
            />
          </YStack>
          <YStack flex={1} gap="$2">
            <Text fos={12} fontWeight="600" color="$colorMuted" tt="uppercase" ls={1.2}>
              To
            </Text>
            <Input
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              
              autoCapitalize="none"
              bg="$background"
              borderColor="$borderColor"
              color="$color"
            />
          </YStack>
        </XStack>

        <XStack gap="$3" mt="$2">
          <Button
            flex={1}
            bg="transparent"
            borderWidth={1}
            borderColor="$borderColor"
            onPress={reset}
            h={44}
          >
            <Text color="$color" fos={14} fontWeight="500">
              Clear
            </Text>
          </Button>
          <Button flex={1} bg="#c8a96e" onPress={apply} h={44} pressStyle={{ opacity: 0.8 }}>
            <Text color="#0a0a0a" fontWeight="700" fos={14}>
              Apply
            </Text>
          </Button>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}

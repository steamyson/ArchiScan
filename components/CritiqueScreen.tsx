import { YStack, Text } from "tamagui";
import { Metronome, Ruler, Cube, Buildings, Sun } from "phosphor-react-native";
import type { Icon } from "phosphor-react-native";
import type { BuildingSummary, Critique } from "../types/scan";
import { stripMarkdown } from "../lib/critiqueUtils";
import { BuildingSummaryHeader } from "./BuildingSummaryHeader";
import { CritiqueSection } from "./CritiqueSection";
import { AIDisclosure } from "./AIDisclosure";

interface CritiqueScreenProps {
  critique: Critique;
  summary: BuildingSummary;
  address?: string | null;
}

interface SectionConfig {
  key: keyof Critique;
  title: string;
  Icon: Icon;
}

const SECTIONS: SectionConfig[] = [
  { key: "rhythm_and_repetition", title: "Rhythm & Repetition", Icon: Metronome },
  { key: "proportion_and_scale", title: "Proportion & Scale", Icon: Ruler },
  { key: "materiality_and_tectonics", title: "Materiality & Tectonics", Icon: Cube },
  { key: "contextual_dialogue", title: "Contextual Dialogue", Icon: Buildings },
  { key: "light_and_shadow", title: "Light & Shadow", Icon: Sun },
];

export function CritiqueScreen({ critique, summary, address }: CritiqueScreenProps) {
  return (
    <YStack px="$5" pt="$5" bg="$background">
      <BuildingSummaryHeader summary={summary} address={address} />
      {SECTIONS.map(({ key, title, Icon }, i) => (
        <CritiqueSection
          key={key}
          title={title}
          body={stripMarkdown(critique[key] ?? "")}
          IconComponent={Icon}
          delay={i * 100}
        />
      ))}
      <AIDisclosure />
    </YStack>
  );
}

export function CritiqueUnavailable() {
  return (
    <YStack bg="$background" ai="center" jc="center" px="$6" py="$10">
      <Text fos={14} color="$colorMuted" ta="center">
        Critique unavailable for this scan.
      </Text>
    </YStack>
  );
}

export function CritiqueSkeleton() {
  return (
    <YStack px="$5" pt="$5" gap="$5" bg="$background">
      {[0, 1, 2, 3, 4].map((i) => (
        <YStack key={i} gap="$2">
          <YStack w={120} h={14} br="$2" bg="$backgroundFocus" />
          <YStack w="100%" h={60} br="$2" bg="$backgroundFocus" />
        </YStack>
      ))}
    </YStack>
  );
}

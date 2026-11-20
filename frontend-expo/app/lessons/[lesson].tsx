import GlassBlurView from "@/components/GlassBlurView";
import { lessonFiles, puzzleThemeForSlug } from "@/components/lessons/Lessons";
import { BackgroundContext } from "@/context/Backgrounds";
import GlobalStyle from "@/context/GlobalStyle";
import { useTheme } from "@/context/ThemeContext";
import { lessonStepCount, parseLessonMarkdown } from "@/utils/parseLessonMarkdown";
import { useGlobalSearchParams, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Markdown from 'react-native-markdown-display';
import LessonPuzzle from "@/components/puzzles/LessonPuzzle";

function resolveLessonAsset(lessonKey: string) {
  if (lessonFiles[lessonKey]) {
    return lessonFiles[lessonKey];
  }
  if (/^\d+$/.test(lessonKey) && lessonFiles[`lesson${lessonKey}`]) {
    return lessonFiles[`lesson${lessonKey}`];
  }
  return null;
}

export default function Lesson() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const global = useGlobalSearchParams();
    const { theme } = useTheme();
    const [content, setContent] = useState<string[]>([]);
    const [page, setPage] = useState<number>(1);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const lessonKey = String(params.lesson ?? '');
    const queryLessonId = params.lessonId != null ? String(params.lessonId) : undefined;
    const dynamicTitle = `Lesson: ${lessonKey || '…'}`;
    const isTablet = global.isTablet === 'true';
    const puzzleTheme = puzzleThemeForSlug(lessonKey);
    const stepCount = lessonStepCount(content);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: dynamicTitle,
        });

        let cancelled = false;
        setLoadState('loading');
        setErrorMessage(null);
        setPage(1);

        const asset = resolveLessonAsset(lessonKey);
        if (!asset) {
            setContent(parseLessonMarkdown(''));
            setErrorMessage(`Lesson "${lessonKey}" was not found.`);
            setLoadState('error');
            return;
        }

        const uri = Image.resolveAssetSource(asset)?.uri;
        if (!uri) {
            setContent(parseLessonMarkdown(''));
            setErrorMessage('Could not resolve lesson asset.');
            setLoadState('error');
            return;
        }

        fetch(uri)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load lesson (${res.status})`);
                }
                return res.text();
            })
            .then(text => {
                if (cancelled) return;
                setContent(parseLessonMarkdown(text));
                setLoadState('ready');
            })
            .catch(err => {
                if (cancelled) return;
                console.log('md load error', err);
                setContent(parseLessonMarkdown(''));
                setErrorMessage(err instanceof Error ? err.message : 'Failed to load lesson');
                setLoadState('error');
            });

        return () => {
            cancelled = true;
        };
    }, [navigation, dynamicTitle, lessonKey]);

    function pageBack() {
        if (page > 1) {
            setPage(page - 1);
        }
    }

    function pageForward() {
        if (page < stepCount) {
            setPage(page + 1);
        } else if (page === stepCount) {
            router.back();
            if (queryLessonId) {
                router.setParams({ lessonCompleted: queryLessonId });
            }
        }
    }

    const styles = GlobalStyle(theme, isTablet);

    if (loadState === 'loading') {
        return (
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
                <BackgroundContext theme={theme}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.primaryText} />
                        <Text style={{ ...styles.p, color: theme.primaryText, marginTop: 12 }}>
                            Loading lesson…
                        </Text>
                    </View>
                </BackgroundContext>
            </GestureHandlerRootView>
        );
    }

    if (loadState === 'error' || stepCount < 1) {
        return (
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
                <BackgroundContext theme={theme}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <Text style={{ ...styles.h3, color: theme.titleText, textAlign: 'center' }}>
                            {errorMessage || 'This lesson has no content.'}
                        </Text>
                        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
                            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                            <Text style={{ ...styles.h4, color: theme.secondaryText, textAlign: 'center', padding: 15 }}>
                                Go back
                            </Text>
                        </TouchableOpacity>
                    </View>
                </BackgroundContext>
            </GestureHandlerRootView>
        );
    }

    const marker = content[page * 2 - 1];
    const body = content[page * 2] ?? '';

    if (marker === '***PAGE***') {
        return (
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
                <BackgroundContext theme={theme}>
                    <ScrollView contentContainerStyle={{ ...styles.scrollContainer }}>

                        <Markdown style={{
                            body: {fontFamily: 'Nunito'},
                            paragraph: {...styles.p, color: theme.primaryText},
                            heading1: {...styles.h1, marginTop: 50, color: theme.titleText},
                            heading2: {...styles.h2, marginTop: 20, color: theme.titleText},
                            heading3: {...styles.h3, marginTop: 15, color: theme.titleText},
                            heading4: {...styles.h4, marginTop: 10, color: theme.titleText},
                            heading5: {...styles.h5, marginTop: 10, color: theme.titleText},
                            heading6: {...styles.h6, marginTop: 10, color: theme.titleText},
                            blockquote: {...styles.blockquote, backgroundColor: theme.primaryButton},
                            code_inline: { ...styles.p, color: theme.primaryText, backgroundColor: theme.primaryButton },
                            code_block: { ...styles.p, color: theme.primaryText, backgroundColor: theme.primaryButton },
                            fence: { color: theme.secondaryText, fontSize: isTablet ? 16 : 14, lineHeight: isTablet ? 18 : 16, backgroundColor: theme.secondaryButton, borderRadius: 10 },
                            list_item: {...styles.bullet, color: theme.primaryText},
                            table: {borderWidth: 2, borderColor: theme.secondaryButton, ...styles.p},
                            thead: {backgroundColor: theme.secondaryButton, color: theme.secondaryText},
                            tbody: {color: theme.primaryText},
                        }}>
                            {String(body)}
                        </Markdown>

                        <View style={{...styles.hStack, gap: isTablet ? 30 : 20}}>

                            <TouchableOpacity style={{flex: 1, opacity: page > 1 ? 1 : 0.4}} onPress={() => {
                                    pageBack();
                                }}>
                                <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
                                <Text style={{...styles.h4, color: theme.primaryText, textAlign: 'center', padding: 15}}>
                                    Previous
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={{flex: 1}} onPress={() => {
                                    pageForward();
                                }}>
                                <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                                <Text style={{...styles.h4, color: theme.secondaryText, textAlign: 'center', padding: 15}}>
                                    {page < stepCount ? 'Next' : 'Complete'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </BackgroundContext>
            </GestureHandlerRootView>
        );
    }

    if (marker === '***PUZZLE***') {
        return (
            <LessonPuzzle
                key={`puzzle-${page}-${body.trim()}`}
                length={content.length}
                page={page}
                pageBack={pageBack}
                pageForward={pageForward}
                pagePrevPuzzle={page > 1 && content[page * 2 - 3] === '***PUZZLE***'}
                pageNextPuzzle={page < stepCount && content[page * 2 + 1] === '***PUZZLE***'}
                puzzleId={body.trim()}
                puzzleTheme={puzzleTheme}
            />
        );
    }

    // Unknown segment — never blank the screen.
    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
            <BackgroundContext theme={theme}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Text style={{ ...styles.h3, color: theme.titleText, textAlign: 'center' }}>
                        Unexpected lesson step.
                    </Text>
                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => pageForward()}>
                        <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                        <Text style={{ ...styles.h4, color: theme.secondaryText, textAlign: 'center', padding: 15 }}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                </View>
            </BackgroundContext>
        </GestureHandlerRootView>
    );
}

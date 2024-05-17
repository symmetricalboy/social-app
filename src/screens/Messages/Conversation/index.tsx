import React, {useCallback} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {AppBskyActorDefs, moderateProfile, ModerationOpts} from '@atproto/api'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect, useNavigation} from '@react-navigation/native'
import {NativeStackScreenProps} from '@react-navigation/native-stack'

import {makeProfileLink} from '#/lib/routes/links'
import {CommonNavigatorParams, NavigationProp} from '#/lib/routes/types'
import {useGate} from '#/lib/statsig/statsig'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {useCurrentConvoId} from '#/state/messages/current-convo-id'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useProfileQuery} from '#/state/queries/profile'
import {BACK_HITSLOP} from 'lib/constants'
import {sanitizeDisplayName} from 'lib/strings/display-names'
import {isWeb} from 'platform/detection'
import {ConvoProvider, isConvoActive, useConvo} from 'state/messages/convo'
import {ConvoStatus} from 'state/messages/convo/types'
import {useSetMinimalShellMode} from 'state/shell'
import {PreviewableUserAvatar} from 'view/com/util/UserAvatar'
import {CenteredView} from 'view/com/util/Views'
import {MessagesList} from '#/screens/Messages/Conversation/MessagesList'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {ConvoMenu} from '#/components/dms/ConvoMenu'
import {Error} from '#/components/Error'
import {Link} from '#/components/Link'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {ClipClopGate} from '../gate'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'MessagesConversation'
>
export function MessagesConversationScreen({route}: Props) {
  const gate = useGate()
  const {gtMobile} = useBreakpoints()
  const setMinimalShellMode = useSetMinimalShellMode()

  const convoId = route.params.conversation
  const {setCurrentConvoId} = useCurrentConvoId()

  useFocusEffect(
    useCallback(() => {
      setCurrentConvoId(convoId)

      if (isWeb && !gtMobile) {
        setMinimalShellMode(true)
      }

      return () => {
        setCurrentConvoId(undefined)
        setMinimalShellMode(false)
      }
    }, [gtMobile, convoId, setCurrentConvoId, setMinimalShellMode]),
  )

  if (!gate('dms')) return <ClipClopGate />

  return (
    <ConvoProvider convoId={convoId}>
      <Inner />
    </ConvoProvider>
  )
}

function Inner() {
  const t = useTheme()
  const convoState = useConvo()
  const {_} = useLingui()

  const [hasInitiallyRendered, setHasInitiallyRendered] = React.useState(false)

  // HACK: Because we need to scroll to the bottom of the list once initial items are added to the list, we also have
  // to take into account that scrolling to the end of the list on native will happen asynchronously. This will cause
  // a little flicker when the items are first renedered at the top and immediately scrolled to the bottom. to prevent
  // this, we will wait until the first render has completed to remove the loading overlay.
  React.useEffect(() => {
    if (
      !hasInitiallyRendered &&
      isConvoActive(convoState) &&
      !convoState.isFetchingHistory
    ) {
      setTimeout(() => {
        setHasInitiallyRendered(true)
      }, 15)
    }
  }, [convoState, hasInitiallyRendered])

  if (convoState.status === ConvoStatus.Error) {
    return (
      <CenteredView style={a.flex_1} sideBorders>
        <Header />
        <Error
          title={_(msg`Something went wrong`)}
          message={_(msg`We couldn't load this conversation`)}
          onRetry={() => convoState.error.retry()}
        />
      </CenteredView>
    )
  }

  /*
   * Any other convo states (atm) are "ready" states
   */
  return (
    <CenteredView style={[a.flex_1]} sideBorders>
      <Header profile={convoState.recipients?.[0]} />
      <View style={[a.flex_1]}>
        {isConvoActive(convoState) ? (
          <MessagesList />
        ) : (
          <ListMaybePlaceholder isLoading />
        )}
        {!hasInitiallyRendered && (
          <View
            style={[
              a.absolute,
              a.z_10,
              a.w_full,
              a.h_full,
              a.justify_center,
              a.align_center,
              t.atoms.bg,
            ]}>
            <View style={[{marginBottom: 75}]}>
              <Loader size="xl" />
            </View>
          </View>
        )}
      </View>
    </CenteredView>
  )
}

const PFP_SIZE = isWeb ? 40 : 34

let Header = ({
  profile: initialProfile,
}: {
  profile?: AppBskyActorDefs.ProfileViewBasic
}): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()
  const {gtTablet} = useBreakpoints()
  const navigation = useNavigation<NavigationProp>()
  const moderationOpts = useModerationOpts()
  const {data: profile} = useProfileQuery({did: initialProfile?.did})

  const onPressBack = useCallback(() => {
    if (isWeb) {
      navigation.replace('Messages')
    } else {
      navigation.goBack()
    }
  }, [navigation])

  return (
    <View
      style={[
        t.atoms.bg,
        t.atoms.border_contrast_low,
        a.border_b,
        a.flex_row,
        a.align_center,
        a.gap_sm,
        gtTablet ? a.pl_lg : a.pl_xl,
        a.pr_lg,
        a.py_sm,
      ]}>
      {!gtTablet && (
        <TouchableOpacity
          testID="conversationHeaderBackBtn"
          onPress={onPressBack}
          hitSlop={BACK_HITSLOP}
          style={{width: 30, height: 30}}
          accessibilityRole="button"
          accessibilityLabel={_(msg`Back`)}
          accessibilityHint="">
          <FontAwesomeIcon
            size={18}
            icon="angle-left"
            style={{
              marginTop: 6,
            }}
            color={t.atoms.text.color}
          />
        </TouchableOpacity>
      )}

      {profile && moderationOpts ? (
        <HeaderReady profile={profile} moderationOpts={moderationOpts} />
      ) : (
        <>
          <View style={[a.flex_row, a.align_center, a.gap_md, a.flex_1]}>
            <View
              style={[
                {width: PFP_SIZE, height: PFP_SIZE},
                a.rounded_full,
                t.atoms.bg_contrast_25,
              ]}
            />
            <View style={a.gap_xs}>
              <View
                style={[
                  {width: 120, height: 16},
                  a.rounded_xs,
                  t.atoms.bg_contrast_25,
                  a.mt_xs,
                ]}
              />
              <View
                style={[
                  {width: 175, height: 12},
                  a.rounded_xs,
                  t.atoms.bg_contrast_25,
                ]}
              />
            </View>
          </View>

          <View style={{width: 30}} />
        </>
      )}
    </View>
  )
}
Header = React.memo(Header)

function HeaderReady({
  profile: profileUnshadowed,
  moderationOpts,
}: {
  profile: AppBskyActorDefs.ProfileViewBasic
  moderationOpts: ModerationOpts
}) {
  const t = useTheme()
  const convoState = useConvo()
  const profile = useProfileShadow(profileUnshadowed)
  const moderation = React.useMemo(
    () => moderateProfile(profile, moderationOpts),
    [profile, moderationOpts],
  )

  const isDeletedAccount = profile?.handle === 'missing.invalid'
  const displayName = isDeletedAccount
    ? 'Deleted Account'
    : sanitizeDisplayName(
        profile.displayName || profile.handle,
        moderation.ui('displayName'),
      )

  return (
    <>
      <Link
        style={[a.flex_row, a.align_center, a.gap_md, a.flex_1, a.pr_md]}
        to={makeProfileLink(profile)}>
        <PreviewableUserAvatar
          size={PFP_SIZE}
          profile={profile}
          moderation={moderation.ui('avatar')}
          disableHoverCard={moderation.blocked}
        />
        <View style={a.flex_1}>
          <Text
            style={[a.text_md, a.font_bold, web(a.leading_normal)]}
            numberOfLines={1}>
            {displayName}
          </Text>
          {!isDeletedAccount && (
            <Text
              style={[
                t.atoms.text_contrast_medium,
                a.text_sm,
                web([a.leading_normal, {marginTop: -2}]),
              ]}
              numberOfLines={1}>
              @{profile.handle}
            </Text>
          )}
        </View>
      </Link>

      {isConvoActive(convoState) && (
        <ConvoMenu
          convo={convoState.convo}
          profile={profile}
          currentScreen="conversation"
          moderation={moderation}
        />
      )}
    </>
  )
}

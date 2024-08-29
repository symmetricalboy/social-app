import {AppBskyVideoDefs} from '@atproto/api'
import {useMutation} from '@tanstack/react-query'
import {nanoid} from 'nanoid/non-secure'

import {cancelable} from '#/lib/async/cancelable'
import {CompressedVideo} from '#/lib/media/video/compress'
import {createVideoEndpointUrl} from '#/state/queries/video/util'
import {useAgent, useSession} from '#/state/session'

export const useUploadVideoMutation = ({
  onSuccess,
  onError,
  setProgress,
  signal,
}: {
  onSuccess: (response: AppBskyVideoDefs.JobStatus) => void
  onError: (e: any) => void
  setProgress: (progress: number) => void
  signal: AbortSignal
}) => {
  const {currentAccount} = useSession()
  const agent = useAgent()

  return useMutation({
    mutationKey: ['video', 'upload'],
    mutationFn: cancelable(async (video: CompressedVideo) => {
      const uri = createVideoEndpointUrl('/xrpc/app.bsky.video.uploadVideo', {
        did: currentAccount!.did,
        name: `${nanoid(12)}.mp4`, // @TODO: make sure it's always mp4'
      })

      // a logged-in agent should have this set, but we'll check just in case
      if (!agent.pdsUrl) {
        throw new Error('Agent does not have a PDS URL')
      }

      const {data: serviceAuth} = await agent.com.atproto.server.getServiceAuth(
        {
          aud: `did:web:${agent.pdsUrl.hostname}`,
          lxm: 'com.atproto.repo.uploadBlob',
          exp: Date.now() + 1000 * 60 * 30, // 30 minutes
        },
      )

      const bytes = await fetch(video.uri).then(res => res.arrayBuffer())

      const xhr = new XMLHttpRequest()
      const res = await new Promise<AppBskyVideoDefs.JobStatus>(
        (resolve, reject) => {
          xhr.upload.addEventListener('progress', e => {
            const progress = e.loaded / e.total
            setProgress(progress)
          })
          xhr.onloadend = () => {
            if (xhr.readyState === 4) {
              const uploadRes = JSON.parse(
                xhr.responseText,
              ) as AppBskyVideoDefs.JobStatus
              resolve(uploadRes)
              onSuccess(uploadRes)
            } else {
              reject()
              onError(new Error('Failed to upload video'))
            }
          }
          xhr.onerror = () => {
            reject()
            onError(new Error('Failed to upload video'))
          }
          xhr.open('POST', uri)
          xhr.setRequestHeader('Content-Type', 'video/mp4')
          xhr.setRequestHeader('Authorization', `Bearer ${serviceAuth.token}`)
          xhr.send(bytes)
        },
      )

      return res
    }, signal),
    onError,
    onSuccess,
  })
}

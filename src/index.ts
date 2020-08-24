import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('issues.opened', async (context) => {
    if (!context.payload.repository.full_name.startsWith('koreanbots/')) return
    if (context.payload.issue.labels.find(r => r.name.includes('bug')) && context.payload.repository.name === "koreanbots") {
      context.github.issues.createComment(context.issue({
        body: `**버그를 제보해주셔서 감사합니다.**
해당 버그가 지원하지 않는 기기에서만 발생하는 버그인지 다시 한 번 확인해주세요.
\`\`\`md
  - 어떠한 확장프로그램 (AdBlock, Darkmode etc.)
  - 브라우저: IE, Pre 17 Edge.
  - Windows 7 이전의 Windows
  - 10.10 버전 이하의 macOS
  - 10.0 버전 이하의 iOS
  - 5.0 버전 이하의 안드로이드
  - 3.5" 아이폰
  - 모든 VM
  - 탈옥 또는 루팅된 기기
  - 공식 지원 종료된 모든 리눅스 버전
  - 보안 이슈 또는 취약점(보안과 관련된 문제는 비공개적이게 개발자에게 전달해주세요)
  - 정식빌드에서는 발생하지 않는 Canary혹은 PTB와 같은 베타 버전의 브라우저/OS에서 발생하는 버그
  - 이외 개발자가 지원 종료 선언한 모든 플랫폼혹은 기기
\`\`\`
      
버그는 2개의 승인 혹은 2개의 거부를 받게되면 승인과 거부가 결정됩니다.
      
이슈에 대해서는 아래처럼 댓글을 남겨주세요.

- \`CR\` Can Reproduce 의 약자로 재현 가능한 버그라는 뜻입니다.
- \`CNR\` Can Not Reproduce 의 약자로 재현이 불가능하다는 뜻입니다.
- \`NAB\` Not a Bug 의 약자로 버그에 해당하지 않는다는 뜻입니다.
      `
      }))
    } else if (context.payload.issue.labels.find(r => r.name.includes('enhancement'))) {
      context.github.issues.createComment(context.issue({
        body: `**제안을 남겨주셔서 감사합니다.**
제안사항은 관리자의 검토 후 승인되거나 거부될 수 있습니다!
      
해당 제안이 마음에 드신다면, 이슈에 👍 반응을 남겨주세요.`
      }))
    } else {
      context.github.issues.createComment(context.issue({ body: '이슈를 남겨주셔서 감사합니다!\n곧 처리될테니 침착하게 기다려주세요!' }))
    }
  })

  app.on('issue_comment.created', async (context) => {
    if (!context.payload.comment.body.startsWith('/')) return
    if (!['MEMBER', 'COLLABORATOR', 'OWNER'].includes(context.payload.comment.author_association)) return context.github.reactions.createForIssueComment(context.issue({ comment_id: context.payload.comment.id, content: 'eyes' }))
    const data = {
      raw: context.payload.comment.body,
      arg: context.payload.comment.body.replace('/', '').split(' ').slice(1),
      args: context.payload.comment.body.replace('/', '').split(' ').slice(1).join(' '),
      arg2: context.payload.comment.body.replace('/', '').split(' ').splice(2).join(' '),
      prefix: '/',
      cmd: context.payload.comment.body
        .replace('/', '')
        .split(' ')[0]
        .toLowerCase()
    }

    const params = {
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number
    }
    const labels = await context.github.issues.listLabelsForRepo({ ...params })
    switch (data.cmd.toLowerCase()) {
      case 'deny':
        context.github.issues.addLabels(context.issue({ labels: ['deny', ...data.arg.filter(r => labels.data.find(a => a.name === r))] }))
        context.github.issues.createComment(context.issue({ body: `안타깝게도 거부되었습니다.\n\n${context.payload.repository.owner.login === 'koreanbots' && '기타 문의사항이 있으시다면 [공식 디스코드](https://discord.gg/JEh53MQ)를 방문해주세요!'}` }))
        context.github.issues.update({ ...params, state: 'closed' })
        break
      case 'dupe':
      case 'duplicate':
        if (!labels.data.find(a => a.name === 'duplicate' || a.name === 'dupe')) return context.github.reactions.createForIssue(context.issue({ content: 'eyes' }))
        context.github.issues.addLabels(context.issue({ labels: ['deny', ...labels.data.map(r => r.name).filter(a => a === 'duplicate' || a === 'dupe')] }))
        context.github.issues.createComment(context.issue({ body: `안타깝게도 이미 중복되는 이슈가 있습니다.${data.args ? `중복되는 이슈: ${data.args}\n` : ''}\n\n${context.payload.repository.owner.login === 'koreanbots' && '기타 문의사항이 있으시다면 [공식 디스코드](https://discord.gg/JEh53MQ)를 방문해주세요!'}` }))
        context.github.issues.update({ ...params, state: 'closed' })
        break
      case 'p':
        if (!labels.data.find(a => a.name === `P${data.arg[0]}`)) return context.github.reactions.createForIssueComment(context.issue({ comment_id: context.payload.comment.id, content: 'eyes' }))
        const lab = await context.github.issues.listLabelsOnIssue(context.issue())
        const l = lab.data.map(r => r.name).filter(r => !r.match(/P\d/))
        l.push(`P${data.arg[0]}`)
        context.github.issues.replaceLabels(context.issue({ labels: l }))
        context.github.issues.createComment(context.issue({ body: `\`P${data.arg[0]}\`의 중요도가 배정되었습니다.` }))
        break
      case 'approve':
        context.github.issues.addLabels(context.issue({ labels: ['approved'] }))
        context.github.issues.createComment(context.issue({ body: '승인되었습니다.' }))
        context.github.issues.update({ ...params, state: 'open' })
      break;
    }
  })
}
